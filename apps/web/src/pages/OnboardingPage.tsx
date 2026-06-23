import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompleteOnboardingMutation } from "@/hooks/api";
import type { AppUser } from "@/lib/api";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowPhase = "welcome" | "questioning" | "completing" | "done";

type QuestionType = "text" | "radio" | "checkbox";

interface Question {
	id: string;
	text: string;
	hint?: string;
	type: QuestionType;
	options?: string[];
	placeholder?: string;
}

const MASCOT_SRC = "/june-bug-logo.png";

const QUESTIONS: Question[] = [
	{
		id: "fullName",
		text: "First things first — what should I call you?",
		type: "text",
		placeholder: "Jane Smith",
	},
	{
		id: "currentRole",
		text: "What do you do?",
		hint: "Your title, your craft — however you would put it.",
		type: "text",
		placeholder: "Software Engineer",
	},
	{
		id: "experienceLevel",
		text: "How seasoned are you in the dev world?",
		type: "radio",
		options: ["Junior", "Mid-Level", "Senior", "Lead", "Principal"],
	},
	{
		id: "mentorshipStyle",
		text: "How do you like to grow and learn?",
		type: "radio",
		options: ["Structured", "Exploratory", "Challenge-driven", "Reflective"],
	},
	{
		id: "developmentGoals",
		text: "What are you working toward right now?",
		hint: "Pick as many as feel right.",
		type: "checkbox",
		options: [
			"Build better debugging skills",
			"Improve system design",
			"Learn new technologies",
			"Improve code quality",
			"Better work-life balance",
			"Career advancement",
			"Team collaboration",
			"Open source contribution",
		],
	},
	{
		id: "techStack",
		text: "What's in your toolkit?",
		hint: "Languages, frameworks — the stuff you reach for.",
		type: "text",
		placeholder: "React, TypeScript, Node.js, PostgreSQL",
	},
	{
		id: "journalingFrequency",
		text: "How often would you like to reflect?",
		type: "radio",
		options: ["Daily", "Every other day", "Weekly", "Custom schedule"],
	},
];

function isAnswerValid(
	question: Question,
	value: string | string[] | undefined,
): boolean {
	if (value === undefined) return false;
	if (question.type === "text") {
		return typeof value === "string" && value.trim().length > 0;
	}
	if (question.type === "radio") {
		return typeof value === "string" && value.length > 0;
	}
	if (question.type === "checkbox") {
		return Array.isArray(value) && value.length > 0;
	}
	return false;
}

const COMPLETING_MIN_DELAY_MS = 3200;
const DONE_NAVIGATE_DELAY_MS = 1800;

// ─── Mascot ───────────────────────────────────────────────────────────────────

function MascotFallback() {
	return (
		<div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-3xl select-none">
			🪲
		</div>
	);
}

function MascotAvatar({
	wiggle = false,
	size = "lg",
	className,
}: {
	wiggle?: boolean;
	size?: "md" | "lg";
	className?: string;
}) {
	const [imgError, setImgError] = useState(false);
	const sizeClass = size === "lg" ? "h-32 w-32 p-5" : "h-28 w-28 p-4";

	return (
		<div
			className={cn(
				"relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border/60 bg-card shadow-[0_8px_24px_-8px_oklch(0.41_0.08_78.86/0.25)]",
				sizeClass,
				!wiggle && "animate-gentle-float",
				wiggle && "animate-happy-wiggle",
				className,
			)}
			aria-hidden
		>
			{!imgError ? (
				<img
					src={MASCOT_SRC}
					alt=""
					className="h-full w-full object-contain"
					onError={() => setImgError(true)}
				/>
			) : (
				<MascotFallback />
			)}
		</div>
	);
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
	return (
		<div
			className="fixed inset-x-0 top-0 z-20 h-0.5 bg-border/40"
			role="progressbar"
			aria-valuenow={Math.round(progress)}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div
				className="h-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
}

function ProgressDots({ total, current }: { total: number; current: number }) {
	return (
		<div
			className="flex flex-col items-center gap-3 pt-8"
			aria-label={`Question ${current + 1} of ${total}`}
		>
			<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{current + 1} of {total}
			</p>
			<div className="flex items-center justify-center gap-2">
				{Array.from({ length: total }, (_, i) => (
					<span
						key={i}
						className={cn(
							"h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
							i === current ? "w-6 bg-primary" : "w-1.5",
							i < current ? "bg-primary/70" : i > current ? "bg-border" : "",
						)}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Option cards ─────────────────────────────────────────────────────────────

function OptionCard({
	label,
	selected,
	onClick,
	disabled,
	mode,
}: {
	label: string;
	selected: boolean;
	onClick: () => void;
	disabled?: boolean;
	mode: "radio" | "checkbox";
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"group relative w-full rounded-xl border-2 px-5 py-4 text-left text-sm font-medium transition-all duration-200 motion-reduce:transition-none",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				"disabled:pointer-events-none disabled:opacity-50",
				selected
					? "scale-[1.02] border-primary bg-primary/10 text-foreground"
					: "border-border bg-card text-foreground hover:scale-[1.01] hover:border-primary/40 hover:bg-muted/40",
			)}
		>
			<span className="flex items-center justify-between gap-3">
				<span>{label}</span>
				{selected && (
					<span
						className={cn(
							"flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
							mode === "radio" ? "rounded-full" : "rounded-md",
						)}
					>
						<Check className="h-3 w-3" strokeWidth={3} />
					</span>
				)}
			</span>
		</button>
	);
}

// ─── Answer inputs ────────────────────────────────────────────────────────────

interface AnswerInputProps {
	question: Question;
	value: string | string[] | undefined;
	onChange: (value: string | string[]) => void;
	onContinue: () => void;
	disabled: boolean;
}

function AnswerInput({
	question,
	value,
	onChange,
	onContinue,
	disabled,
}: AnswerInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const textValue = typeof value === "string" ? value : "";
	const selectedRadio =
		question.type === "radio" && typeof value === "string" ? value : "";
	const checkboxValues =
		question.type === "checkbox" && Array.isArray(value) ? value : [];

	useEffect(() => {
		if (question.type === "text") {
			const timer = setTimeout(() => inputRef.current?.focus(), 100);
			return () => clearTimeout(timer);
		}
	}, [question.id, question.type]);

	const handleRadioSelect = (option: string) => {
		if (disabled) return;
		onChange(option);
	};

	const handleCheckboxToggle = (option: string) => {
		if (disabled) return;
		const next = checkboxValues.includes(option)
			? checkboxValues.filter((v) => v !== option)
			: [...checkboxValues, option];
		onChange(next);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (isAnswerValid(question, textValue)) onContinue();
		}
	};

	if (question.type === "text") {
		return (
			<div className="mt-8">
				<Input
					ref={inputRef}
					type="text"
					placeholder={question.placeholder}
					value={textValue}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					className="h-12 border-2 bg-card text-center text-base md:text-lg"
					aria-label={question.text}
				/>
			</div>
		);
	}

	if (question.type === "radio" && question.options) {
		return (
			<div className="mt-8 grid grid-cols-1 gap-3">
				{question.options.map((option) => (
					<OptionCard
						key={option}
						label={option}
						selected={selectedRadio === option}
						onClick={() => handleRadioSelect(option)}
						disabled={disabled}
						mode="radio"
					/>
				))}
			</div>
		);
	}

	if (question.type === "checkbox" && question.options) {
		return (
			<div className="mt-8 grid grid-cols-1 gap-3">
				{question.options.map((option) => (
					<OptionCard
						key={option}
						label={option}
						selected={checkboxValues.includes(option)}
						onClick={() => handleCheckboxToggle(option)}
						disabled={disabled}
						mode="checkbox"
					/>
				))}
			</div>
		);
	}

	return null;
}

// ─── Step navigation ──────────────────────────────────────────────────────────

function StepNavigation({
	onBack,
	onContinue,
	showBack,
	continueLabel,
	continueDisabled,
	isLoading,
}: {
	onBack?: () => void;
	onContinue: () => void;
	showBack?: boolean;
	continueLabel: string;
	continueDisabled?: boolean;
	isLoading?: boolean;
}) {
	return (
		<div
			className={cn("w-full", showBack ? "pt-2" : "mt-10")}
		>
			<div
				className={cn(
					"flex w-full gap-3",
					showBack ? "flex-row" : "flex-col items-center",
				)}
			>
				{showBack && onBack && (
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={onBack}
						disabled={isLoading}
						className="h-12 min-w-0 flex-1 gap-1.5 text-muted-foreground hover:text-foreground"
					>
						<ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
						Back
					</Button>
				)}
				<Button
					type="button"
					size="lg"
					onClick={onContinue}
					disabled={continueDisabled || isLoading}
					className={cn(
						"h-12 gap-1.5 text-base",
						showBack ? "min-w-0 flex-[1.35]" : "min-w-[160px] px-8",
					)}
				>
					{continueLabel}
					{continueLabel !== "Finish setup" && (
						<ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
					)}
				</Button>
			</div>
		</div>
	);
}

// ─── Screen shells ────────────────────────────────────────────────────────────

function ScreenShell({
	stepKey,
	direction = "forward",
	children,
	dots,
	footer,
}: {
	stepKey: string;
	direction?: "forward" | "back";
	children: React.ReactNode;
	dots?: { total: number; current: number };
	footer?: React.ReactNode;
}) {
	return (
		<div
			key={stepKey}
			className={cn(
				"flex min-h-[min(100dvh,100vh)] w-full flex-col items-center justify-center px-6 py-16",
				direction === "back"
					? "animate-onboarding-step-in-back"
					: "animate-onboarding-step-in-forward",
			)}
		>
			<div className="mx-auto flex w-full max-w-[480px] flex-col items-center text-center">
				{children}
				{dots && <ProgressDots total={dots.total} current={dots.current} />}
				{footer}
			</div>
		</div>
	);
}

function LoadingDots() {
	return (
		<div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
			<span className="h-2 w-2 rounded-full bg-primary animate-onboarding-dot [animation-delay:-0.3s]" />
			<span className="h-2 w-2 rounded-full bg-primary animate-onboarding-dot [animation-delay:-0.15s]" />
			<span className="h-2 w-2 rounded-full bg-primary animate-onboarding-dot" />
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function OnboardingPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [phase, setPhase] = useState<FlowPhase>("welcome");
	const [questionIndex, setQuestionIndex] = useState(0);
	const [stepDirection, setStepDirection] = useState<"forward" | "back">(
		"forward",
	);
	const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
	const [wiggle, setWiggle] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const completingStartedAtRef = useRef<number | null>(null);
	const apiSucceededRef = useRef(false);
	const completedUserRef = useRef<AppUser | null>(null);

	const goToDoneAndNavigate = useCallback(() => {
		setPhase("done");
		navigateTimerRef.current = setTimeout(() => {
			// Prime onboarding status to onboarded so the destination guard
			// (OnboardingGuard) doesn't bounce back to /onboarding, then refresh
			// the rest of the app-user data. Deferring this until navigation is
			// what preserves the completing/done delay sequence.
			queryClient.setQueryData(["appUser", "onboarding", "status"], {
				data: { isOnboarded: true, user: completedUserRef.current },
			});
			queryClient.invalidateQueries({ queryKey: ["appUser"] });
			navigate("/entries");
		}, DONE_NAVIGATE_DELAY_MS);
	}, [navigate, queryClient]);

	const finishCompletingWhenReady = useCallback(() => {
		const startedAt = completingStartedAtRef.current ?? Date.now();
		const elapsed = Date.now() - startedAt;
		const remaining = Math.max(0, COMPLETING_MIN_DELAY_MS - elapsed);

		navigateTimerRef.current = setTimeout(goToDoneAndNavigate, remaining);
	}, [goToDoneAndNavigate]);

	const completeOnboardingMutation = useCompleteOnboardingMutation({
		onSuccess: (response) => {
			apiSucceededRef.current = true;
			completedUserRef.current = response.data;
			finishCompletingWhenReady();
		},
		onError: () => {
			apiSucceededRef.current = false;
			completingStartedAtRef.current = null;
			if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
			setSubmitError(
				"Something went wrong saving your preferences. Please try again.",
			);
			setPhase("questioning");
			setQuestionIndex(QUESTIONS.length - 1);
			setStepDirection("back");
		},
	});

	useEffect(() => {
		return () => {
			if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
		};
	}, []);

	const triggerWiggle = useCallback(() => {
		setWiggle(true);
		setTimeout(() => setWiggle(false), 700);
	}, []);

	const progress =
		phase === "welcome"
			? 0
			: phase === "questioning"
				? ((questionIndex + 1) / QUESTIONS.length) * 100
				: 100;

	const submitOnboarding = useCallback(
		(finalAnswers: Record<string, string | string[]>) => {
			setSubmitError(null);
			apiSucceededRef.current = false;
			completingStartedAtRef.current = Date.now();
			setPhase("completing");

			const techStackRaw = finalAnswers["techStack"];
			const techStack =
				typeof techStackRaw === "string"
					? techStackRaw
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean)
					: (techStackRaw as string[]);

			completeOnboardingMutation.mutate({
				payload: {
					fullName: finalAnswers["fullName"] as string,
					currentRole: finalAnswers["currentRole"] as string,
					experienceLevel: finalAnswers["experienceLevel"] as string,
					mentorshipStyle: finalAnswers["mentorshipStyle"] as string,
					developmentGoals: finalAnswers["developmentGoals"] as string[],
					techStack,
					journalingFrequency: finalAnswers["journalingFrequency"] as string,
				},
			});
		},
		[completeOnboardingMutation],
	);

	const currentQuestion = QUESTIONS[questionIndex];
	const currentAnswer = currentQuestion
		? answers[currentQuestion.id]
		: undefined;
	const isLastQuestion = questionIndex === QUESTIONS.length - 1;
	const isQuestionValid = currentQuestion
		? isAnswerValid(currentQuestion, currentAnswer)
		: false;
	const isBusy = completeOnboardingMutation.isPending;

	const handleAnswerChange = useCallback(
		(value: string | string[]) => {
			if (!currentQuestion) return;
			setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
			if (submitError) setSubmitError(null);
		},
		[currentQuestion, submitError],
	);

	const goForward = useCallback(() => {
		if (!currentQuestion || !isQuestionValid || isBusy) return;

		triggerWiggle();

		const normalizedValue =
			currentQuestion.type === "text" && typeof currentAnswer === "string"
				? currentAnswer.trim()
				: currentAnswer!;
		const newAnswers = { ...answers, [currentQuestion.id]: normalizedValue };
		setAnswers(newAnswers);
		setStepDirection("forward");

		if (isLastQuestion) {
			submitOnboarding(newAnswers);
			return;
		}

		setQuestionIndex((index) => index + 1);
	}, [
		answers,
		currentAnswer,
		currentQuestion,
		isBusy,
		isLastQuestion,
		isQuestionValid,
		submitOnboarding,
		triggerWiggle,
	]);

	const goBack = useCallback(() => {
		if (isBusy) return;
		setStepDirection("back");
		setSubmitError(null);

		if (questionIndex > 0) {
			setQuestionIndex((index) => index - 1);
			return;
		}

		setPhase("welcome");
	}, [isBusy, questionIndex]);

	const startQuestioning = useCallback(() => {
		triggerWiggle();
		setStepDirection("forward");
		setPhase("questioning");
	}, [triggerWiggle]);

	return (
		<div className="relative min-h-[min(100dvh,100vh)] bg-background">
			<ProgressBar progress={progress} />

			{phase === "welcome" && (
				<ScreenShell stepKey="welcome" direction={stepDirection}>
					<MascotAvatar size="lg" wiggle={wiggle} className="mb-8" />
					<p className="text-sm font-medium text-primary">June</p>
					<h1 className="mt-2 font-serif text-2xl leading-snug text-foreground md:text-[1.75rem]">
						Hi! I&apos;m June.
					</h1>
					<p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
						I&apos;ll be your journaling companion — here to help you reflect,
						remember, and grow. Ready to get set up?
					</p>
					<StepNavigation
						onContinue={startQuestioning}
						continueLabel="Let's go"
					/>
				</ScreenShell>
			)}

			{phase === "questioning" && currentQuestion && (
				<ScreenShell
					stepKey={`question-${questionIndex}`}
					direction={stepDirection}
					dots={{ total: QUESTIONS.length, current: questionIndex }}
					footer={
						<StepNavigation
							showBack
							onBack={goBack}
							onContinue={goForward}
							continueLabel={isLastQuestion ? "Finish setup" : "Continue"}
							continueDisabled={!isQuestionValid}
							isLoading={isBusy}
						/>
					}
				>
					<MascotAvatar size="md" wiggle={wiggle} className="mb-8" />
					<p className="text-sm font-medium text-primary">June asks</p>
					<h2 className="mt-2 font-serif text-xl leading-snug text-foreground md:text-2xl">
						{currentQuestion.text}
					</h2>
					{currentQuestion.hint && (
						<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
							{currentQuestion.hint}
						</p>
					)}
					{submitError && isLastQuestion && (
						<p className="mt-4 text-sm text-destructive" role="alert">
							{submitError}
						</p>
					)}
					<div className="w-full">
						<AnswerInput
							key={currentQuestion.id}
							question={currentQuestion}
							value={currentAnswer}
							onChange={handleAnswerChange}
							onContinue={goForward}
							disabled={isBusy}
						/>
					</div>
				</ScreenShell>
			)}

			{phase === "completing" && (
				<ScreenShell stepKey="completing">
					<MascotAvatar
						size="lg"
						wiggle
						className="mb-8 motion-reduce:animate-none"
					/>
					<h2 className="font-serif text-xl leading-snug text-foreground md:text-2xl">
						Setting up your journal...
					</h2>
					<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
						Just a moment while I personalize everything for you.
					</p>
					<LoadingDots />
				</ScreenShell>
			)}

			{phase === "done" && (
				<ScreenShell stepKey="done">
					<MascotAvatar
						size="lg"
						wiggle
						className="mb-8 motion-reduce:animate-none"
					/>
					<h2 className="font-serif text-xl leading-snug text-foreground md:text-2xl">
						You&apos;re all set!
					</h2>
					<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
						Your journal is ready. See you inside.
					</p>
				</ScreenShell>
			)}
		</div>
	);
}
