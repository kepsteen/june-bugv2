import { db } from '@/lib/db/index.js';
import { aiService } from '@/lib/ai/ai.service.js';
import { memoryEmbeddings, type MemoryEmbedding } from './memories.table.js';

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
  const { embedding, embeddingModel } = await aiService.embedText({
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
