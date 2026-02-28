import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, Briefcase, Trophy, Bug, Lightbulb } from 'lucide-react';

interface Category {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  prompts: string[];
}

const categories: Category[] = [
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
  onPromptClick?: (prompt: string) => void;
}

export function PromptsSidebar({ isOpen, onClose, onPromptClick }: PromptsSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

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
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left p-3 rounded-lg bg-gradient-to-br ${cat.gradient} border border-border hover:scale-[1.02] hover:shadow-sm transition-all`}
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
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Writing Prompts
            </h3>

            <div className="space-y-2 overflow-y-auto">
              {selectedCategory.prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onPromptClick?.(prompt)}
                  className="w-full text-left text-sm p-3 rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
