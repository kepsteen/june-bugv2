import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { wrapService } from '@/lib/service-wrapper.js';
import { AppError } from '@/lib/errors/index.js';
import z from 'zod';

// Types for memory extraction
const memoryCategorySchema = z.enum([
  'career_goal',
  'project',
  'milestone',
  'preference',
  'technical',
  'personal',
]);

const extractMemoriesOutputSchema = z.object({
  newMemories: z.array(
    z.object({
      content: z.string().describe('A concise, one-sentence memory about the user'),
      category: memoryCategorySchema.describe('The category of this memory'),
    })
  ),
  deactivatedMemoryIds: z.array(
    z.string().describe('IDs of existing memories that are now outdated or contradicted')
  ),
});

const generatePromptsOutputSchema = z.object({
  summary: z.string().describe('A narrative summary of what the user is currently working on'),
  topics: z.array(z.string()).describe('Short-term themes extracted from recent entries'),
  prompts: z.array(
    z.object({
      category: z.string().describe('Category for grouping (e.g., Current Work, Career Growth)'),
      prompt: z.string().describe('The personalized writing prompt'),
    })
  ).describe('5-8 personalized writing prompts'),
});

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

  async extractMemories({
    newEntries,
    existingMemories,
  }: {
    newEntries: string[];
    existingMemories: { id: string; content: string; category: string }[];
  }): Promise<{
    newMemories: { content: string; category: string }[];
    deactivatedMemoryIds: string[];
  }> {
    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const entriesText = newEntries.map((e, i) => `Entry ${i + 1}:\n${e}`).join('\n\n---\n\n');
    const memoriesText = existingMemories
      .map((m) => `ID: ${m.id}\nContent: ${m.content}\nCategory: ${m.category}`)
      .join('\n\n---\n\n');

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: extractMemoriesOutputSchema,
      }),
      system: `You are an AI that extracts long-term memories from journal entries. Your job is to:

1. Identify noteworthy facts worth remembering: career goals, projects, milestones, preferences, technical interests, and personal context
2. Keep each memory concise (one sentence)
3. Categorize each memory appropriately
4. Check if any existing memories are now outdated or contradicted by new information

Categories:
- career_goal: Professional aspirations (e.g., "Wants to become a staff engineer")
- project: Current work projects (e.g., "Migrating codebase to TypeScript")
- milestone: Achievements or significant events (e.g., "Got promoted to Senior Engineer")
- preference: Work style or preferences (e.g., "Prefers pair programming")
- technical: Technical interests or skills (e.g., "Learning Rust")
- personal: Personal context that affects work (e.g., "Has a new baby, working reduced hours")

Be selective - only extract genuinely important facts that would be useful to remember months later.`,
      prompt: `Analyze these new journal entries and update the user's long-term memory.

## New Entries to Analyze:
${entriesText}

## Existing Memories (check if any are now outdated):
${memoriesText || 'No existing memories'}

Extract new memories and identify any existing memories that should be deactivated.`,
    });

    const result = JSON.parse(text);
    return {
      newMemories: result.newMemories,
      deactivatedMemoryIds: result.deactivatedMemoryIds,
    };
  },

  async generatePersonalizedPrompts({
    recentEntries,
    memories,
    userProfile,
  }: {
    recentEntries: string[];
    memories: string[];
    userProfile: {
      role?: string;
      experienceLevel?: string;
      goals?: string[];
      techStack?: string[];
    };
  }): Promise<{
    summary: string;
    topics: string[];
    prompts: { category: string; prompt: string }[];
  }> {
    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new AppError('OpenAI API key not configured', 500);
    }

    const entriesText = recentEntries.map((e, i) => `Entry ${i + 1}:\n${e}`).join('\n\n---\n\n');
    const memoriesText = memories.map((m, i) => `${i + 1}. ${m}`).join('\n');
    const profileText = [
      userProfile.role && `Role: ${userProfile.role}`,
      userProfile.experienceLevel && `Experience: ${userProfile.experienceLevel}`,
      userProfile.goals?.length && `Goals: ${userProfile.goals.join(', ')}`,
      userProfile.techStack?.length && `Tech Stack: ${userProfile.techStack.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: generatePromptsOutputSchema,
      }),
      system: `You are an AI writing assistant for a developer journaling app. Your job is to generate personalized writing prompts that help the user reflect on their work.

Guidelines:
- Generate 5-8 prompts that weave together the user's long-term goals and current work context
- Prompts should feel personal and reference specific things the user has mentioned
- Mix different types: reflection on current work, career growth, technical learning, wins, challenges
- Keep prompts concise but specific
- Avoid generic prompts like "What did you work on today?" - instead use specifics from their entries`,
      prompt: `Generate personalized writing prompts for this developer.

## User Profile:
${profileText || 'No profile data'}

## Long-term Memories (what we know about them over time):
${memoriesText || 'No long-term memories yet'}

## Recent Entries (what they're working on now):
${entriesText}

Generate a summary, topics, and personalized prompts.`,
    });

    const result = JSON.parse(text);
    return {
      summary: result.summary,
      topics: result.topics,
      prompts: result.prompts,
    };
  },
};

export const aiService = wrapService('aiService', aiServiceRaw);