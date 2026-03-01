import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { wrapService } from '@/lib/service-wrapper.js';
import { AppError } from '@/lib/errors/index.js';
import z from 'zod';

const aiServiceRaw = {
  async generateTitle({ content }: { content: string }): Promise<string> {
    if (!content?.trim()) {
      throw new AppError('Content is required for title generation', 400);
    }

    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: z.object({
          title: z.string()
            .max(50)
            .refine(
              (val) => !val.includes('"') && !val.includes("'"),
              { message: "Title must not contain quotes" }
            ),
        }),
      }),
      prompt: `Generate a concise title (max 50 chars, do not use quotes) for this journal entry:\n\n${content}`,
    });
    const textJSON = JSON.parse(text);
    return textJSON.title;
  },
};

export const aiService = wrapService('aiService', aiServiceRaw);