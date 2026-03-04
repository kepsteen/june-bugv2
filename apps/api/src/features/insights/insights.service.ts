import { db } from '@/lib/db/index.js';
import { userMemories } from './memories.table.js';
import { userInsights } from './insights.table.js';
import { entries } from '../entries/entries.table.js';
import { appUsers } from '../app-users/app-users.table.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { wrapService } from '@/lib/service-wrapper.js';
import { aiService } from '@/lib/ai/ai.service.js';
import type { UserMemory, NewUserMemory } from './memories.table.js';
import type { UserInsight, NewUserInsight } from './insights.table.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const RECENT_ENTRIES_LIMIT = 20;

const insightsServiceRaw = {
  // Get cached personalized prompts for a user
  async getPersonalizedPrompts(userId: string): Promise<{
    prompts: { category: string; prompt: string }[];
    summary: string;
    topics: string[];
    lastAnalyzedAt: Date;
  } | null> {
    const [insight] = await db
      .select()
      .from(userInsights)
      .where(eq(userInsights.userId, userId));

    if (!insight) return null;

    return {
      prompts: insight.personalizedPrompts,
      summary: insight.summary,
      topics: insight.topics,
      lastAnalyzedAt: insight.lastAnalyzedAt,
    };
  },

  // Get all active memories for a user
  async getMemories(userId: string): Promise<UserMemory[]> {
    return db
      .select()
      .from(userMemories)
      .where(and(eq(userMemories.userId, userId), eq(userMemories.isActive, true)))
      .orderBy(desc(userMemories.createdAt));
  },

  // Get all memories (including inactive) for a user - for future management UI
  async getAllMemories(userId: string): Promise<UserMemory[]> {
    return db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, userId))
      .orderBy(desc(userMemories.createdAt));
  },

  // Core refresh pipeline - two phases: extract memories, then generate prompts
  async refreshInsights(userId: string): Promise<void> {
    // Check if AI is configured
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.warn('[insightsService] AI not configured, skipping insights refresh');
      return;
    }

    // Get the user's last analysis timestamp
    const [existingInsight] = await db
      .select()
      .from(userInsights)
      .where(eq(userInsights.userId, userId));

    const lastAnalyzedAt = existingInsight?.lastAnalyzedAt;

    // Phase 1: Extract new memories from entries since last analysis
    await this.extractAndStoreMemories(userId, lastAnalyzedAt);

    // Phase 2: Generate personalized prompts using memories + recent entries + profile
    await this.generateAndStoreInsights(userId);
  },

  // Phase 1: Extract memories from new entries
  async extractAndStoreMemories(
    userId: string,
    since?: Date
  ): Promise<{ newCount: number; deactivatedCount: number }> {
    // Build where conditions
    const baseConditions = [eq(entries.userId, userId)];
    if (since) {
      baseConditions.push(gte(entries.createdAt, since));
    }

    // Fetch entries created since last analysis (or all entries if first run)
    const newEntries = await db
      .select({
        id: entries.id,
        plainText: entries.plainText,
      })
      .from(entries)
      .where(and(...baseConditions))
      .orderBy(desc(entries.createdAt));

    // Filter out entries with no content
    const entriesWithContent = newEntries.filter((e) => e.plainText && e.plainText.trim().length > 0);

    if (entriesWithContent.length === 0) {
      return { newCount: 0, deactivatedCount: 0 };
    }

    // Fetch existing active memories
    const existingMemories = await db
      .select({
        id: userMemories.id,
        content: userMemories.content,
        category: userMemories.category,
      })
      .from(userMemories)
      .where(and(eq(userMemories.userId, userId), eq(userMemories.isActive, true)));

    // Call AI to extract new memories and identify outdated ones
    const { newMemories, deactivatedMemoryIds } = await aiService.extractMemories({
      newEntries: entriesWithContent.map((e) => e.plainText!),
      existingMemories: existingMemories.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
      })),
    });

    // Store new memories
    let newCount = 0;
    if (newMemories.length > 0) {
      const memoryValues = newMemories.map((memory, index) => ({
        userId,
        content: memory.content,
        category: memory.category as UserMemory['category'],
        sourceEntryId: entriesWithContent[index]?.id ?? null,
        isActive: true,
      }));

      await db.insert(userMemories).values(memoryValues);
      newCount = newMemories.length;
    }

    // Deactivate outdated memories
    let deactivatedCount = 0;
    if (deactivatedMemoryIds.length > 0) {
      for (const memoryId of deactivatedMemoryIds) {
        await db
          .update(userMemories)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(userMemories.id, memoryId), eq(userMemories.userId, userId)));
      }
      deactivatedCount = deactivatedMemoryIds.length;
    }

    console.log(
      `[insightsService] Memory extraction: ${newCount} new, ${deactivatedCount} deactivated for user ${userId}`
    );

    return { newCount, deactivatedCount };
  },

  // Phase 2: Generate personalized prompts using all context
  async generateAndStoreInsights(userId: string): Promise<void> {
    // Fetch recent entries for short-term context
    const recentEntries = await db
      .select({ plainText: entries.plainText })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.entryDate))
      .limit(RECENT_ENTRIES_LIMIT);

    const entriesWithContent = recentEntries
      .filter((e) => e.plainText && e.plainText.trim().length > 0)
      .map((e) => e.plainText!);

    // Fetch all active long-term memories
    const activeMemories = await this.getMemories(userId);
    const memoryContents = activeMemories.map((m) => m.content);

    // Fetch user profile
    const [userProfile] = await db
      .select({
        currentRole: appUsers.currentRole,
        experienceLevel: appUsers.experienceLevel,
        developmentGoals: appUsers.developmentGoals,
        techStack: appUsers.techStack,
      })
      .from(appUsers)
      .where(eq(appUsers.id, userId));

    // Generate insights via AI
    const { summary, topics, prompts } = await aiService.generatePersonalizedPrompts({
      recentEntries: entriesWithContent,
      memories: memoryContents,
      userProfile: {
        role: userProfile?.currentRole ?? undefined,
        experienceLevel: userProfile?.experienceLevel ?? undefined,
        goals: userProfile?.developmentGoals ?? undefined,
        techStack: userProfile?.techStack ?? undefined,
      },
    });

    // Upsert insights row
    const now = new Date();
    const insightData: NewUserInsight = {
      userId,
      summary,
      topics,
      personalizedPrompts: prompts,
      entriesAnalyzedCount: entriesWithContent.length,
      lastAnalyzedAt: now,
    };

    // Check if insight row exists
    const [existing] = await db.select().from(userInsights).where(eq(userInsights.userId, userId));

    if (existing) {
      await db
        .update(userInsights)
        .set({
          summary: insightData.summary,
          topics: insightData.topics,
          personalizedPrompts: insightData.personalizedPrompts,
          entriesAnalyzedCount: insightData.entriesAnalyzedCount,
          lastAnalyzedAt: insightData.lastAnalyzedAt,
          updatedAt: now,
        })
        .where(eq(userInsights.userId, userId));
    } else {
      await db.insert(userInsights).values(insightData);
    }

    console.log(
      `[insightsService] Generated insights for user ${userId}: ${prompts.length} prompts, ${topics.length} topics`
    );
  },

  // Check if insights are stale and refresh if needed (fire-and-forget)
  async refreshIfStale(userId: string): Promise<void> {
    try {
      const [insight] = await db
        .select({ lastAnalyzedAt: userInsights.lastAnalyzedAt })
        .from(userInsights)
        .where(eq(userInsights.userId, userId));

      const lastAnalyzed = insight?.lastAnalyzedAt;
      const isStale = !lastAnalyzed || Date.now() - lastAnalyzed.getTime() > STALE_THRESHOLD_MS;

      if (isStale) {
        // Fire-and-forget: don't await, let it run in background
        this.refreshInsights(userId).catch((err) => {
          console.error(`[insightsService] Background refresh failed for user ${userId}:`, err);
        });
      }
    } catch (err) {
      console.error(`[insightsService] Error checking staleness for user ${userId}:`, err);
    }
  },
};

export const insightsService = wrapService('insightsService', insightsServiceRaw);
