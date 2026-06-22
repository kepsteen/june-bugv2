import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompleteOnboardingMutation } from "@/hooks/api";
import { Check } from "lucide-react";
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

const AUTO_ADVANCE_MS = 600;
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
			className="flex items-center justify-center gap-2 pt-8"
			aria-label={`Question ${current + 1} of ${total}`}
		>
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
	onSubmit: (value: string | string[]) => void;
	onWiggle: () => void;
	disabled: boolean;
}

function AnswerInput({
	question,
	onSubmit,
	onWiggle,
	disabled,
}: AnswerInputProps) {
	const [textValue, setTextValue] = useState("");
	const [selectedRadio, setSelectedRadio] = useState("");
	const [checkboxValues, setCheckboxValues] = useState<string[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setTextValue("");
		setSelectedRadio("");
		setCheckboxValues([]);
		if (question.type === "text") {
			const timer = setTimeout(() => inputRef.current?.focus(), 100);
			return () => clearTimeout(timer);
		}
	}, [question.id, question.type]);

	useEffect(() => {
		return () => {
			if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
		};
	}, []);

	const handleRadioSelect = (option: string) => {
		if (disabled) return;
		setSelectedRadio(option);
		onWiggle();
		advanceTimerRef.current = setTimeout(() => {
			onSubmit(option);
		}, AUTO_ADVANCE_MS);
	};

	const handleCheckboxToggle = (option: string) => {
		if (disabled) return;
		setCheckboxValues((prev) =>
			prev.includes(option)
				? prev.filter((v) => v !== option)
				: [...prev, option],
		);
	};

	const handleTextSubmit = () => {
		if (!textValue.trim() || disabled) return;
		onWiggle();
		onSubmit(textValue.trim());
	};

	const handleCheckboxSubmit = () => {
		if (checkboxValues.length === 0 || disabled) return;
		onWiggle();
		onSubmit(checkboxValues);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleTextSubmit();
		}
	};

	if (question.type === "text") {
		return (
			<div className="mt-8 space-y-4">
				<Input
					ref={inputRef}
					type="text"
					placeholder={question.placeholder}
					value={textValue}
					onChange={(e) => setTextValue(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					className="h-12 border-2 bg-card text-center text-base md:text-lg"
					aria-label={question.text}
				/>
				<Button
					onClick={handleTextSubmit}
					disabled={!textValue.trim() || disabled}
					className="h-12 w-full text-base"
					size="lg"
				>
					Continue
				</Button>
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
						disabled={disabled || Boolean(selectedRadio)}
						mode="radio"
					/>
				))}
			</div>
		);
	}

	if (question.type === "checkbox" && question.options) {
		return (
			<div className="mt-8 space-y-4">
				<div className="grid grid-cols-1 gap-3">
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
				<Button
					onClick={handleCheckboxSubmit}
					disabled={checkboxValues.length === 0 || disabled}
					className="h-12 w-full text-base"
					size="lg"
				>
					Continue
				</Button>
			</div>
		);
	}

	return null;
}

// ─── Screen shells ────────────────────────────────────────────────────────────

function ScreenShell({
	stepKey,
	children,
	dots,
}: {
	stepKey: string;
	children: React.ReactNode;
	dots?: { total: number; current: number };
}) {
	return (
		<div
			key={stepKey}
			className="animate-onboarding-step-in flex min-h-[min(100dvh,100vh)] w-full flex-col items-center justify-center px-6 py-16"
		>
			<div className="mx-auto flex w-full max-w-[480px] flex-col items-center text-center">
				{children}
				{dots && <ProgressDots total={dots.total} current={dots.current} />}
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
	const [phase, setPhase] = useState<FlowPhase>("welcome");
	const [questionIndex, setQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
	const [wiggle, setWiggle] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isAdvancing, setIsAdvancing] = useState(false);
	const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const completingStartedAtRef = useRef<number | null>(null);
	const apiSucceededRef = useRef(false);

	const goToDoneAndNavigate = useCallback(() => {
		setPhase("done");
		navigateTimerRef.current = setTimeout(() => {
			navigate("/entries");
		}, DONE_NAVIGATE_DELAY_MS);
	}, [navigate]);

	const finishCompletingWhenReady = useCallback(() => {
		const startedAt = completingStartedAtRef.current ?? Date.now();
		const elapsed = Date.now() - startedAt;
		const remaining = Math.max(0, COMPLETING_MIN_DELAY_MS - elapsed);

		navigateTimerRef.current = setTimeout(goToDoneAndNavigate, remaining);
	}, [goToDoneAndNavigate]);

	const completeOnboardingMutation = useCompleteOnboardingMutation({
		onSuccess: () => {
			apiSucceededRef.current = true;
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
			setIsAdvancing(false);
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

	const handleAnswer = (value: string | string[]) => {
		if (isAdvancing) return;

		const question = QUESTIONS[questionIndex];
		const newAnswers = { ...answers, [question.id]: value };
		setAnswers(newAnswers);
		setIsAdvancing(true);

		const nextIndex = questionIndex + 1;

		if (nextIndex < QUESTIONS.length) {
			setTimeout(() => {
				setQuestionIndex(nextIndex);
				setIsAdvancing(false);
			}, 280);
		} else {
			setTimeout(() => {
				submitOnboarding(newAnswers);
				setIsAdvancing(false);
			}, 400);
		}
	};

	const currentQuestion = QUESTIONS[questionIndex];

	return (
		<div className="relative min-h-[min(100dvh,100vh)] bg-background">
			<ProgressBar progress={progress} />

			{phase === "welcome" && (
				<ScreenShell stepKey="welcome">
					<MascotAvatar size="lg" wiggle={wiggle} className="mb-8" />
					<p className="text-sm font-medium text-primary">June</p>
					<h1 className="mt-2 font-serif text-2xl leading-snug text-foreground md:text-[1.75rem]">
						Hi! I&apos;m June.
					</h1>
					<p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
						I&apos;ll be your journaling companion — here to help you reflect,
						remember, and grow. Ready to get set up?
					</p>
					<Button
						className="mt-10 h-12 min-w-[160px] px-8 text-base"
						size="lg"
						onClick={() => {
							triggerWiggle();
							setPhase("questioning");
						}}
					>
						Let&apos;s go
					</Button>
				</ScreenShell>
			)}

			{phase === "questioning" && currentQuestion && (
				<ScreenShell
					stepKey={`question-${questionIndex}`}
					dots={{ total: QUESTIONS.length, current: questionIndex }}
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
					{submitError && questionIndex === QUESTIONS.length - 1 && (
						<p className="mt-4 text-sm text-destructive" role="alert">
							{submitError}
						</p>
					)}
					<div className="w-full">
						<AnswerInput
							key={currentQuestion.id}
							question={currentQuestion}
							onSubmit={handleAnswer}
							onWiggle={triggerWiggle}
							disabled={isAdvancing || completeOnboardingMutation.isPending}
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
