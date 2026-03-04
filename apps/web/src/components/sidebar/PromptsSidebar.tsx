import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, Briefcase, Trophy, Bug, Lightbulb, Sparkles, Check } from 'lucide-react';
import { useGetPersonalizedPromptsQuery } from '@/hooks/api';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  prompts: string[];
}

const staticCategories: Category[] = [
  {
    id: 'working-on',
    title: "What are you working on?",
    description: "Capture your current project focus.",
    icon: Briefcase,
    gradient: 'from-blue-500/10 to-blue-600/5',
    prompts: [
      "What's the most challenging part of your current task?",
      "What technical decision did you make today, and why?",
      "What did you learn from your code review today?",
      "What would make tomorrow's work session more productive?",
      "What problem have you been avoiding? What's the first step to tackle it?",
    ],
  },
  {
    id: 'celebrate-win',
    title: "Celebrate a win",
    description: "Acknowledge your accomplishments.",
    icon: Trophy,
    gradient: 'from-green-500/10 to-green-600/5',
    prompts: [
      "What did you ship today that you're proud of?",
      "What bug did you squash after hours of debugging?",
      "Who did you help today, and how?",
      "What skill improved noticeably today?",
      "What feedback did you receive that felt validating?",
    ],
  },
  {
    id: 'track-bug',
    title: "Track a bug",
    description: "Document issues and their solutions.",
    icon: Bug,
    gradient: 'from-red-500/10 to-red-600/5',
    prompts: [
      "What's the bug you encountered? Describe the symptoms.",
      "What did you try that didn't work?",
      "What was the root cause once you found it?",
      "How will you prevent this bug from recurring?",
      "What does this bug teach you about the system?",
    ],
  },
  {
    id: 'capture-lesson',
    title: "Capture a lesson",
    description: "Record insights and learnings.",
    icon: Lightbulb,
    gradient: 'from-yellow-500/10 to-yellow-600/5',
    prompts: [
      "What concept finally clicked today?",
      "What would you tell a junior dev about what you learned?",
      "What assumption did you have that turned out to be wrong?",
      "What article, doc, or resource was most helpful today?",
      "How does today's learning connect to something you already knew?",
    ],
  },
];

interface PromptsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptClick?: (prompt: string, promptId?: string) => void;
  activePrompts?: string[];
}

type SelectedView =
  | { type: 'category'; category: Category }
  | { type: 'personalized' }
  | null;

export function PromptsSidebar({ isOpen, onClose, onPromptClick, activePrompts = [] }: PromptsSidebarProps) {
  const [selectedView, setSelectedView] = useState<SelectedView>(null);
  const { data: insightsData, isLoading } = useGetPersonalizedPromptsQuery({
    enabled: isOpen,
  });

  const insights = insightsData?.data;
  const hasPersonalizedPrompts = insights && insights.prompts.length > 0;

  const handleBack = () => setSelectedView(null);

  // Helper to check if a prompt is active (already in the editor)
  const isPromptActive = (promptText: string) => activePrompts.includes(promptText);

  return (
    <aside
      className="border-l bg-sidebar flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: isOpen ? '320px' : '0px' }}
    >
      <div className="flex flex-col h-full w-[320px] p-4">
        {!selectedView ? (
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
              {/* Personalized for You - always shown at top, conditionally enabled */}
              <button
                onClick={() => hasPersonalizedPrompts && setSelectedView({ type: 'personalized' })}
                disabled={!hasPersonalizedPrompts || isLoading}
                className={`text-left p-3 rounded-lg bg-linear-to-br from-purple-500/10 to-purple-600/5 border border-border transition-all ${
                  hasPersonalizedPrompts && !isLoading
                    ? 'hover:scale-[1.02] hover:shadow-sm cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Personalized for You</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isLoading
                    ? 'Loading your personalized prompts...'
                    : hasPersonalizedPrompts
                      ? 'AI-generated prompts based on your entries'
                      : 'Write a few entries and JuneBug will learn what you\'re working on'}
                </p>
              </button>

              {/* Static categories */}
              {staticCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedView({ type: 'category', category: cat })}
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
        ) : selectedView.type === 'personalized' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
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
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h2 className="text-sm font-semibold">Personalized for You</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-16 w-full bg-muted animate-pulse rounded-md" />
              </div>
            ) : insights ? (
              <>
                {insights.summary && (
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {insights.summary}
                  </p>
                )}

                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Writing Prompts
                </h3>

                <div className="space-y-2 overflow-y-auto">
                  {insights.prompts.map((prompt, i) => {
                    const isActive = isPromptActive(prompt.prompt);
                    return (
                      <button
                        key={i}
                        onClick={() => onPromptClick?.(prompt.prompt)}
                        disabled={isActive}
                        className={cn(
                          'w-full text-left text-sm p-3 rounded-md border border-border transition-colors',
                          isActive
                            ? 'bg-muted/50 cursor-default'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-purple-500 font-medium block mb-1 flex-1">
                            {prompt.category}
                          </span>
                          {isActive && (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        {prompt.prompt}
                      </button>
                    );
                  })}
                </div>

                {insights.lastAnalyzedAt && (
                  <p className="text-[10px] text-muted-foreground mt-4 text-center">
                    Last updated: {new Date(insights.lastAnalyzedAt).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No personalized prompts yet.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Write a few entries and JuneBug will learn what you&apos;re working on.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBack}
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
                const Icon = selectedView.category.icon;
                return <Icon className="h-5 w-5" />;
              })()}
              <h2 className="text-sm font-semibold">{selectedView.category.title}</h2>
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Writing Prompts
            </h3>

            <div className="space-y-2 overflow-y-auto">
              {selectedView.category.prompts.map((prompt, i) => {
                const isActive = isPromptActive(prompt);
                return (
                  <button
                    key={i}
                    onClick={() => onPromptClick?.(prompt)}
                    disabled={isActive}
                    className={cn(
                      'w-full text-left text-sm p-3 rounded-md border border-border transition-colors',
                      isActive
                        ? 'bg-muted/50 cursor-default'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1">{prompt}</span>
                      {isActive && (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
