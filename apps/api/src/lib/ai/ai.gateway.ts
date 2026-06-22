import { embed, generateText, Output } from 'ai';
import type { ZodType } from 'zod';
import { wrapService } from '@/lib/service-wrapper.js';
import { AppError } from '@/lib/errors/index.js';
import { observabilityService } from '@/features/observability/observability.service.js';
import { aiUsageFeatureEnum } from '@/features/observability/observability.table.js';

type AiFeature = (typeof aiUsageFeatureEnum.enumValues)[number];

type RequestContext = Record<string, unknown>;

type TokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export function hasAiGatewayKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

function extractTokenUsage(usage: unknown): TokenUsage {
  if (!usage || typeof usage !== 'object') {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }
  const maybeUsage = usage as Record<string, unknown>;
  const promptTokens =
    typeof maybeUsage.inputTokens === 'number'
      ? maybeUsage.inputTokens
      : typeof maybeUsage.promptTokens === 'number'
        ? maybeUsage.promptTokens
        : null;
  const completionTokens =
    typeof maybeUsage.outputTokens === 'number'
      ? maybeUsage.outputTokens
      : typeof maybeUsage.completionTokens === 'number'
        ? maybeUsage.completionTokens
        : null;
  const totalTokens =
    typeof maybeUsage.totalTokens === 'number' ? maybeUsage.totalTokens : null;
  return { promptTokens, completionTokens, totalTokens };
}

async function recordGatewayError({
  userId,
  feature,
  model,
  startTime,
  requestContext,
  errorMessage,
}: {
  userId: string;
  feature: AiFeature;
  model: string;
  startTime: number;
  requestContext?: RequestContext;
  errorMessage: string;
}) {
  await observabilityService.recordAiUsage({
    userId,
    feature,
    model,
    status: 'error',
    latencyMs: Date.now() - startTime,
    errorMessage,
    requestContext,
  });
}

const aiGatewayRaw = {
  async embed({
    model,
    text,
    userId,
    feature,
    requestContext,
  }: {
    model: string;
    text: string;
    userId: string;
    feature: AiFeature;
    requestContext?: RequestContext;
  }): Promise<{ embedding: number[]; usage: TokenUsage }> {
    if (!hasAiGatewayKey()) {
      const startTime = Date.now();
      await recordGatewayError({
        userId,
        feature,
        model,
        startTime,
        requestContext,
        errorMessage: 'AI gateway API key not configured',
      });
      throw new AppError('AI gateway API key not configured', 500);
    }

    const startTime = Date.now();
    try {
      const result = await embed({ model, value: text });
      const tokenUsage = extractTokenUsage(result.usage);

      await observabilityService.recordAiUsage({
        userId,
        feature,
        model,
        status: 'success',
        latencyMs: Date.now() - startTime,
        tokensInput: tokenUsage.promptTokens ?? undefined,
        requestContext,
      });

      return { embedding: [...result.embedding], usage: tokenUsage };
    } catch (error) {
      await recordGatewayError({
        userId,
        feature,
        model,
        startTime,
        requestContext,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  async generateObject<T>({
    model,
    prompt,
    schema,
    userId,
    feature,
    requestContext,
  }: {
    model: string;
    prompt: string;
    schema: ZodType<T>;
    userId: string;
    feature: AiFeature;
    requestContext?: RequestContext;
  }): Promise<{ data: T; usage: TokenUsage }> {
    if (!hasAiGatewayKey()) {
      const startTime = Date.now();
      await recordGatewayError({
        userId,
        feature,
        model,
        startTime,
        requestContext,
        errorMessage: 'AI gateway API key not configured',
      });
      throw new AppError('AI gateway API key not configured', 500);
    }

    const startTime = Date.now();
    try {
      const aiResult = await generateText({
        model,
        output: Output.object({ schema }),
        prompt,
      });
      const tokenUsage = extractTokenUsage(aiResult.usage);
      const data = JSON.parse(aiResult.text) as T;

      await observabilityService.recordAiUsage({
        userId,
        feature,
        model,
        status: 'success',
        latencyMs: Date.now() - startTime,
        tokensInput: tokenUsage.promptTokens ?? undefined,
        tokensOutput: tokenUsage.completionTokens ?? undefined,
        requestContext,
      });

      return { data, usage: tokenUsage };
    } catch (error) {
      await recordGatewayError({
        userId,
        feature,
        model,
        startTime,
        requestContext,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
};

export const aiGateway = wrapService('aiGateway', aiGatewayRaw);
