import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { X, ChevronLeft, Briefcase, Trophy, Bug, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { useGetPersonalizedPromptsQuery, useRegeneratePersonalizedPromptsMutation, useIsPro } from '@/hooks/api';
import type { MemoryCategory } from '@/lib/api';

interface Category {
  id: string;
  focusCategory: MemoryCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

export const DEMO_PROMPTS: Record<string, string[]> = {
  'working-on': [
    "What did you make progress on today, and what's the next step?",
    'What problem are you trying to solve right now?',
    "What would 'done' look like for this?",
  ],
  'celebrate-win': [
    "What's one thing that went well today, however small?",
    'What did you accomplish that your past self would be proud of?',
    'Who or what helped you get this win?',
  ],
  'track-bug': [
    "What's blocking you, and what have you tried?",
    'What did you expect vs. what happened?',
    "What's your next hypothesis for a fix?",
  ],
  'capture-lesson': [
    'What did you learn today that you want to remember?',
    'What would you do differently next time?',
    'What surprised you about how something worked?',
  ],
};

export const promptCategories: Category[] = [
  {
    id: 'working-on',
    focusCategory: 'goal',
    title: "What are you working on?",
    description: "Capture your current project focus.",
    icon: Briefcase,
    gradient: 'from-blue-500/10 to-blue-600/5',
  },
  {
    id: 'celebrate-win',
    focusCategory: 'win',
    title: "Celebrate a win",
    description: "Acknowledge your accomplishments.",
    icon: Trophy,
    gradient: 'from-green-500/10 to-green-600/5',
  },
  {
    id: 'track-bug',
    focusCategory: 'blocker',
    title: "Track a bug",
    description: "Document issues and their solutions.",
    icon: Bug,
    gradient: 'from-red-500/10 to-red-600/5',
  },
  {
    id: 'capture-lesson',
    focusCategory: 'learning',
    title: "Capture a lesson",
    description: "Record insights and learnings.",
    icon: Lightbulb,
    gradient: 'from-yellow-500/10 to-yellow-600/5',
  },
];

interface PromptsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptClick?: (prompt: string) => void;
  entryId?: string;
  entryDraft?: string;
  demo?: boolean;
}

export function PromptsSidebar({
  isOpen,
  onClose,
  onPromptClick,
  entryId,
  entryDraft,
  demo = false,
}: PromptsSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const regenerateMutation = useRegeneratePersonalizedPromptsMutation();
  const { isPro } = useIsPro();
  const { data, isLoading, isError, refetch, isRefetching } = useGetPersonalizedPromptsQuery(
    {
      entryId: entryId ?? '',
      focusCategory: selectedCategory?.focusCategory,
      entryDraft: entryDraft ?? undefined,
    },
    {
      enabled: !demo && isOpen && !!selectedCategory && !!entryId,
    },
  );

  const demoPrompts = demo && selectedCategory
    ? (DEMO_PROMPTS[selectedCategory.id] ?? []).map((prompt) => ({ prompt, rationale: undefined as string | undefined }))
    : [];
  const prompts = demo ? demoPrompts : (data?.data.prompts ?? []);

  return (
    <aside
      className="border-l bg-sidebar flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: isOpen ? '320px' : '0px' }}
    >
      <div className="flex flex-col h-full w-[320px] p-4">
        {!selectedCategory ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-sidebar-foreground">What's on your mind?</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Choose a category to see helpful writing prompts.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {promptCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left p-3 rounded-lg bg-linear-to-br ${cat.gradient} border border-border hover:scale-[1.02] hover:shadow-sm transition-all`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{cat.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const Icon = selectedCategory.icon;
                return <Icon className="h-5 w-5" />;
              })()}
              <h2 className="text-sm font-semibold">{selectedCategory.title}</h2>
              {!demo && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-auto inline-flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!entryId || regenerateMutation.isPending || !isPro}
                          onClick={() => {
                            if (!entryId || !isPro) return;
                            regenerateMutation.mutate({
                              entryId,
                              focusCategory: selectedCategory.focusCategory,
                              entryDraft: entryDraft ?? undefined,
                            });
                          }}
                        >
                          <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isPro ? (
                      <TooltipContent side="bottom">
                        Refreshing prompts is a Pro feature
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Writing Prompts
            </h3>

            <div className="space-y-2 overflow-y-auto">
              {!demo && (isLoading || isRefetching || regenerateMutation.isPending) ? (
                <div className="text-sm text-muted-foreground border border-border rounded-md p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading personalized prompts...
                </div>
              ) : null}

              {!demo && isError && !isLoading ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground border border-border rounded-md p-3">
                    We couldn't load prompts right now.
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try again
                  </Button>
                </div>
              ) : null}

              {!isLoading && !isError && prompts.length === 0 ? (
                <div className="text-sm text-muted-foreground border border-border rounded-md p-3">
                  {demo
                    ? 'No prompts available for this category.'
                    : 'No prompts yet for this category. Add more entry context and try again.'}
                </div>
              ) : null}

              {(!isLoading || demo) && !isError
                ? prompts.map((item, i) => (
                    <button
                      key={`${item.prompt}-${i}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onPromptClick?.(item.prompt)}
                      className="w-full text-left text-sm p-3 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <p>{item.prompt}</p>
                      {item.rationale ? (
                        <p className="mt-2 text-xs text-muted-foreground">{item.rationale}</p>
                      ) : null}
                    </button>
                  ))
                : null}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
