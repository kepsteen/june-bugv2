import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCompleteOnboardingMutation } from '@/hooks/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'text' | 'number' | 'radio' | 'checkbox';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  placeholder?: string;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    id: 'fullName',
    text: "What's your full name?",
    type: 'text',
    placeholder: 'Jane Smith',
  },
  {
    id: 'age',
    text: "How old are you?",
    type: 'number',
    placeholder: '28',
  },
  {
    id: 'currentRole',
    text: "What's your current role?",
    type: 'text',
    placeholder: 'Software Engineer',
  },
  {
    id: 'experienceLevel',
    text: "What's your experience level?",
    type: 'radio',
    options: ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'],
  },
  {
    id: 'mentorshipStyle',
    text: "What's your mentorship/learning style?",
    type: 'radio',
    options: ['Structured', 'Exploratory', 'Challenge-driven', 'Reflective'],
  },
  {
    id: 'developmentGoals',
    text: "What are your development goals?",
    type: 'checkbox',
    options: [
      'Build better debugging skills',
      'Improve system design',
      'Learn new technologies',
      'Improve code quality',
      'Better work-life balance',
      'Career advancement',
      'Team collaboration',
      'Open source contribution',
    ],
  },
  {
    id: 'techStack',
    text: "What's your tech stack?",
    type: 'text',
    placeholder: 'React, TypeScript, Node.js, PostgreSQL',
  },
  {
    id: 'workEnvironment',
    text: "What's your work environment?",
    type: 'radio',
    options: [
      'Individual contributor at company',
      'Team lead/manager',
      'Freelance/consultant',
      'Student/bootcamp',
      'Career transition/job seeking',
      'Side projects only',
    ],
  },
  {
    id: 'journalingFrequency',
    text: "How often do you plan to journal?",
    type: 'radio',
    options: ['Daily', 'Every other day', 'Weekly', 'Custom schedule'],
  },
  {
    id: 'journalingTime',
    text: "What time do you prefer to journal?",
    type: 'text',
    placeholder: '9:00 AM',
  },
  {
    id: 'notificationPreferences',
    text: "What notification preferences do you have?",
    type: 'checkbox',
    options: ['Push notifications', 'Email reminders', 'None'],
  },
];

// ─── Sidebar phases ───────────────────────────────────────────────────────────

const PHASES = [
  { label: 'Profile Info', questionIds: ['fullName', 'age', 'currentRole', 'experienceLevel'] },
  { label: 'Goals & Style', questionIds: ['mentorshipStyle', 'developmentGoals'] },
  { label: 'Tech Stack', questionIds: ['techStack', 'workEnvironment'] },
  { label: 'Journal Schedule', questionIds: ['journalingFrequency', 'journalingTime', 'notificationPreferences'] },
];

function getPhaseIndex(questionId: string): number {
  return PHASES.findIndex((p) => p.questionIds.includes(questionId));
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar text-muted-foreground text-xs font-semibold select-none border border-border/50">
        JB
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-sidebar px-4 py-2.5 flex items-center gap-1 border border-border/50">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
      </div>
    </div>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────

function ChatMessage({ message }: { message: Message }) {
  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    return (
      <div className="flex items-end gap-2 mb-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar text-muted-foreground text-xs font-semibold select-none border border-border/50">
          JB
        </div>
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-sidebar px-4 py-2.5 text-sm text-foreground border border-border/50">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-end gap-2 mb-4">
      <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {message.content}
      </div>
    </div>
  );
}

// ─── Answer input ─────────────────────────────────────────────────────────────

interface AnswerInputProps {
  question: Question;
  onSubmit: (value: string | string[]) => void;
  isLoading: boolean;
}

function AnswerInput({ question, onSubmit, isLoading }: AnswerInputProps) {
  const [textValue, setTextValue] = useState('');
  const [radioValue, setRadioValue] = useState('');
  const [checkboxValues, setCheckboxValues] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextValue('');
    setRadioValue('');
    setCheckboxValues([]);
    if (question.type === 'text' || question.type === 'number') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [question.id, question.type]);

  const handleCheckboxChange = (option: string, checked: boolean) => {
    setCheckboxValues((prev) =>
      checked ? [...prev, option] : prev.filter((v) => v !== option),
    );
  };

  const handleSubmit = () => {
    if (question.type === 'text' || question.type === 'number') {
      if (!textValue.trim()) return;
      onSubmit(textValue.trim());
    } else if (question.type === 'radio') {
      if (!radioValue) return;
      onSubmit(radioValue);
    } else if (question.type === 'checkbox') {
      if (checkboxValues.length === 0) return;
      onSubmit(checkboxValues);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (question.type === 'text' || question.type === 'number') {
    const isValid = question.type === 'number'
      ? textValue.trim() !== '' && !isNaN(Number(textValue)) && Number(textValue) > 0
      : textValue.trim() !== '';

    return (
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type={question.type}
          placeholder={question.placeholder}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1"
          min={question.type === 'number' ? 1 : undefined}
          max={question.type === 'number' ? 120 : undefined}
        />
        <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
          Send
        </Button>
      </div>
    );
  }

  if (question.type === 'radio' && question.options) {
    return (
      <div className="space-y-3">
        <RadioGroup value={radioValue} onValueChange={setRadioValue} className="grid grid-cols-1 gap-2">
          {question.options.map((option) => (
            <label
              key={option}
              htmlFor={`radio-${option}`}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-sidebar px-4 py-2.5 cursor-pointer hover:bg-sidebar-accent transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10"
            >
              <RadioGroupItem id={`radio-${option}`} value={option} />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </RadioGroup>
        <Button
          onClick={handleSubmit}
          disabled={!radioValue || isLoading}
          className="w-full"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (question.type === 'checkbox' && question.options) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          {question.options.map((option) => (
            <label
              key={option}
              htmlFor={`check-${option}`}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-sidebar px-4 py-2.5 cursor-pointer hover:bg-sidebar-accent transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/10"
            >
              <Checkbox
                id={`check-${option}`}
                checked={checkboxValues.includes(option)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(option, checked === true)
                }
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={checkboxValues.length === 0 || isLoading}
          className="w-full"
        >
          Continue
        </Button>
      </div>
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const completeOnboardingMutation = useCompleteOnboardingMutation({
    onSuccess: (data) => {
      navigate('/entries');
    },
    onError: (error) => {
      setIsSubmitting(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, something went wrong saving your preferences. Please try again.",
        },
      ]);
      setIsComplete(false);
    },
  });

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const currentPhaseIndex = currentQuestion
    ? getPhaseIndex(currentQuestion.id)
    : PHASES.length;

  // Determine completed phases: all phases whose questions are all answered
  const completedPhases = PHASES.map((phase) =>
    phase.questionIds.every((id) => id in answers),
  );

  // Show the first question after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{ role: 'assistant', content: QUESTIONS[0].text }]);
      setIsTyping(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleAnswer = async (value: string | string[]) => {
    const question = QUESTIONS[currentQuestionIndex];

    // Display user answer
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    setMessages((prev) => [...prev, { role: 'user', content: displayValue }]);

    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < QUESTIONS.length) {
      // Show typing indicator, then next question
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: QUESTIONS[nextIndex].text },
        ]);
        setIsTyping(false);
        setCurrentQuestionIndex(nextIndex);
      }, 900);
    } else {
      // All questions answered
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                "You're all set! Let me save your preferences and take you to your journal.",
            },
          ]);
          setIsTyping(false);
          setIsComplete(true);
          setIsSubmitting(true);

          const techStackRaw = newAnswers['techStack'];
          const techStack = typeof techStackRaw === 'string'
            ? techStackRaw.split(',').map((t) => t.trim()).filter(Boolean)
            : (techStackRaw as string[]);

          completeOnboardingMutation.mutate({
            payload: {
              fullName: newAnswers['fullName'] as string,
              age: newAnswers['age'] ? Number(newAnswers['age']) : undefined,
              currentRole: newAnswers['currentRole'] as string,
              experienceLevel: newAnswers['experienceLevel'] as string,
              mentorshipStyle: newAnswers['mentorshipStyle'] as string,
              developmentGoals: newAnswers['developmentGoals'] as string[],
              techStack,
              workEnvironment: newAnswers['workEnvironment'] as string,
              journalingFrequency: newAnswers['journalingFrequency'] as string,
              journalingTime: newAnswers['journalingTime'] as string,
              notificationPreferences: newAnswers['notificationPreferences'] as string[],
            },
          });
        }, 1000);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-sidebar relative">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground">JuneBug</h2>
          <p className="text-xs text-muted-foreground mt-1">Your journaling companion</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Your Journey
          </p>
          <ol className="space-y-0">
            {PHASES.map((phase, i) => {
              const isCompleted = completedPhases[i];
              const isActive = i === currentPhaseIndex && !isComplete;
              const isFuture = i > currentPhaseIndex;

              return (
                <li key={phase.label} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                        isCompleted
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                          ? 'border-2 border-primary bg-sidebar text-primary'
                          : 'border-2 border-border/60 bg-sidebar text-muted-foreground',
                      ].join(' ')}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {i < PHASES.length - 1 && (
                      <div
                        className={[
                          'w-px flex-1 my-1 min-h-[24px]',
                          isCompleted ? 'bg-primary' : 'bg-border/60',
                        ].join(' ')}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-6 pt-0.5">
                    <p
                      className={[
                        'text-sm font-medium',
                        isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground',
                        isFuture ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      {phase.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex overflow-hidden relative pt-2">
        {/* Card container with rounded corner and notch */}
        <div className="flex-1 bg-card overflow-hidden flex flex-col relative rounded-tl-lg border-l border-border/50">
          {/* Top border that stops before notch */}
          <div
            className="absolute top-0 left-0 right-0 h-[0.5px] bg-sidebar transition-opacity duration-500 ease-in-out"
            style={{ right: '65px', left: '8px' }}
          />

          {/* Notch SVG */}
          <div className="absolute top-0 right-0 transition-opacity duration-500 ease-in-out">
            <svg
              className="absolute top-0 right-0 w-21 h-10 pointer-events-none"
              viewBox="0 0 96 48"
              preserveAspectRatio="none"
            >
              <path
                d="M 96,0 L 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48 Z"
                className="fill-sidebar"
              />
              <path
                d="M 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48"
                className="stroke-border fill-none"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Theme toggle - positioned in the notch area */}
          <div className="absolute top-1 right-2 z-10">
            <ThemeToggle />
          </div>

          {/* Chat header */}
          <header className="px-6 py-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold select-none">
              JB
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">JuneBug Setup</p>
              <p className="text-xs text-muted-foreground">Let's personalize your experience</p>
            </div>
            {/* Mobile phase indicator */}
            <div className="ml-auto flex items-center gap-1.5 md:hidden">
              {PHASES.map((_, i) => (
                <span
                  key={i}
                  className={[
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    completedPhases[i]
                      ? 'bg-primary'
                      : i === currentPhaseIndex
                      ? 'bg-primary/60'
                      : 'bg-border',
                  ].join(' ')}
                />
              ))}
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="max-w-xl mx-auto">
              {messages.map((message, i) => (
                <ChatMessage key={i} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          {!isComplete && !isTyping && currentQuestion && (
            <div className="border-t border-border/50 px-4 py-4 md:px-8">
              <div className="max-w-xl mx-auto">
                <AnswerInput
                  key={currentQuestion.id}
                  question={currentQuestion}
                  onSubmit={handleAnswer}
                  isLoading={isSubmitting}
                />
              </div>
            </div>
          )}

          {isComplete && isSubmitting && (
            <div className="border-t border-border/50 px-4 py-4 md:px-8">
              <div className="max-w-xl mx-auto">
                <p className="text-sm text-center text-muted-foreground">
                  Saving your preferences...
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
