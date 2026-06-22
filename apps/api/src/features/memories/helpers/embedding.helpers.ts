import { db } from '@/lib/db/index.js';
import {
  aiGateway,
  MEMORY_EMBEDDING_MODEL,
  MEMORY_EMBEDDING_MODEL_TAG,
} from '@/lib/ai/index.js';
import { AppError } from '@/lib/errors/index.js';
import { memoryEmbeddings, type MemoryEmbedding } from '../table.js';

export async function embedMemoryText({
  text,
  userId,
  entryId,
  memoryId,
}: {
  text: string;
  userId: string;
  entryId?: string;
  memoryId?: string;
}): Promise<{ embedding: number[]; embeddingModel: string }> {
  const trimmed = text?.trim() ?? '';
  const requestContext = { entryId, memoryId };

  if (!trimmed) {
    throw new AppError('Cannot embed empty memory text', 400);
  }

  const { embedding } = await aiGateway.embed({
    model: MEMORY_EMBEDDING_MODEL,
    text: trimmed,
    userId,
    feature: 'memory_embedding',
    requestContext,
  });

  return {
    embedding,
    embeddingModel: MEMORY_EMBEDDING_MODEL_TAG,
  };
}

export async function upsertMemoryEmbedding({
  memoryId,
  text,
  userId,
  entryId,
}: {
  memoryId: string;
  text: string;
  userId: string;
  entryId?: string;
}): Promise<MemoryEmbedding> {
  const { embedding, embeddingModel } = await embedMemoryText({
    text,
    userId,
    entryId,
    memoryId,
  });

  const [row] = await db
    .insert(memoryEmbeddings)
    .values({
      memoryId,
      embedding,
      embeddingModel,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: memoryEmbeddings.memoryId,
      set: {
        embedding,
        embeddingModel,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}
