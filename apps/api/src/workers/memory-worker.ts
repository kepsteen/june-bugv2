import type { ConsumeMessage } from 'amqplib';
import {
  closeRabbitMq,
  consumeMemoryQueue,
  getPublisherChannel,
  isRabbitMqEnabled,
} from '@/lib/queue/rabbitmq.js';
import { MEMORY_EXCHANGE, MEMORY_ROUTING_KEY } from '@/lib/queue/memory-queue.js';
import {
  memoriesPipelineService,
  MemoryJobValidationError,
} from '@/features/memories/memory-pipeline.service.js';

const MAX_RETRIES = 3;

function getRetryCount(msg: ConsumeMessage) {
  const raw = msg.properties.headers?.['x-retry-count'];
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw) || 0;
  return 0;
}

async function scheduleRetry(msg: ConsumeMessage, nextRetryCount: number) {
  const channel = await getPublisherChannel();
  const delayMs = Math.min(30_000, 1_000 * 2 ** nextRetryCount);
  setTimeout(() => {
    channel.publish(MEMORY_EXCHANGE, MEMORY_ROUTING_KEY, msg.content, {
      ...msg.properties,
      headers: {
        ...msg.properties.headers,
        'x-retry-count': nextRetryCount,
      },
      persistent: true,
    });
  }, delayMs);
}

async function bootstrap() {
  if (!isRabbitMqEnabled()) {
    console.log('[memory-worker] RABBITMQ_URL not configured, worker is idle.');
    return;
  }

  await consumeMemoryQueue(async (msg, channel) => {
    try {
      const payload = JSON.parse(msg.content.toString());
      await memoriesPipelineService.processEntryChangedJob({ payload });
      channel.ack(msg);
    } catch (error) {
      if (error instanceof MemoryJobValidationError) {
        console.error('[memory-worker] Non-retriable job validation error:', error.message);
        channel.nack(msg, false, false);
        return;
      }

      const retries = getRetryCount(msg);
      if (retries < MAX_RETRIES) {
        const nextRetryCount = retries + 1;
        console.warn(`[memory-worker] Retrying message (${nextRetryCount}/${MAX_RETRIES})`);
        await scheduleRetry(msg, nextRetryCount);
        channel.ack(msg);
        return;
      }

      console.error('[memory-worker] Max retries reached, moving to DLQ:', error);
      channel.nack(msg, false, false);
    }
  });

  console.log('[memory-worker] Listening for memory extraction jobs...');
}

void bootstrap();

const shutdown = async () => {
  await closeRabbitMq();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
