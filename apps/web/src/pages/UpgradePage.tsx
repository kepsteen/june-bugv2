import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
	ArrowLeft,
	Check,
	Infinity as InfinityIcon,
	Sparkles,
	PenLine,
	Lock,
	Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";
type UpgradeState = "idle" | "loading" | "done";

const PRICING: Record<
	BillingCycle,
	{ amount: number; cadence: string; note: string }
> = {
	monthly: {
		amount: 8,
		cadence: "/ month",
		note: "Billed monthly. Change or cancel whenever.",
	},
	yearly: {
		amount: 6,
		cadence: "/ month",
		note: "Billed $72 yearly — three months on the house.",
	},
};

const PRO_FEATURES = [
	{
		icon: InfinityIcon,
		title: "Unlimited memories",
		description:
			"JuneBug keeps every memory worth holding onto, not just your most recent handful.",
	},
	{
		icon: Sparkles,
		title: "Personalized prompts",
		description:
			"Gentle nudges drawn from your own writing, so the blank page is never quite so blank.",
	},
	{
		icon: PenLine,
		title: "AI-assisted titles",
		description:
			"Every entry quietly named for you, the moment you stop writing.",
	},
	// {
	//   icon: Download,
	//   title: 'Export anytime',
	//   description: 'Take the whole journal with you as Markdown — it was always yours.',
	// },
] as const;

const FREE_KEEPS = [
	"One entry, every day",
	"The full writing experience",
	"A handful of saved memories",
];

function FireflyMark() {
	return (
		<span className="relative inline-flex h-2.5 w-2.5" aria-hidden="true">
			<span className="absolute inset-0 rounded-full bg-primary/40 blur-[3px] animate-gentle-float" />
			<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
		</span>
	);
}

function BillingToggle({
	value,
	onChange,
}: {
	value: BillingCycle;
	onChange: (next: BillingCycle) => void;
}) {
	return (
		<div
			role="group"
			aria-label="Billing cycle"
			className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 p-1"
		>
			{(["monthly", "yearly"] as const).map((cycle) => {
				const active = value === cycle;
				return (
					<button
						key={cycle}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(cycle)}
						className={cn(
							"rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							active
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{cycle}
						{cycle === "yearly" && (
							<span
								className={cn(
									"ml-1.5 text-xs",
									active ? "text-primary-foreground/80" : "text-primary",
								)}
							>
								· save 25%
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

export function UpgradePage() {
	const navigate = useNavigate();
	const [cycle, setCycle] = useState<BillingCycle>("yearly");
	const [state, setState] = useState<UpgradeState>("idle");

	const price = PRICING[cycle];

	// Hard-coded mutation — wiring lives elsewhere. Just fakes a checkout round-trip.
	const handleUpgrade = () => {
		setState("loading");
		window.setTimeout(() => setState("done"), 1100);
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
				<Link
					to="/settings"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to settings
				</Link>

				<div className="mt-10 grid items-start gap-10 lg:mt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
					{/* Editorial narrative */}
					<div className="max-w-[34rem]">
						<p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
							<FireflyMark />
							JuneBug Pro
						</p>

						<h1 className="mt-5 font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl">
							A little more room
							<br />
							to reflect.
						</h1>

						<p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
							You already show up for yourself every day. Pro simply keeps more
							of what you write — every memory, and prompts that know your story.
						</p>

						<ul className="mt-9 space-y-7">
							{PRO_FEATURES.map(({ icon: Icon, title, description }) => (
								<li key={title} className="flex gap-4">
									<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
										<Icon className="h-[18px] w-[18px]" />
									</span>
									<div>
										<h2 className="font-medium text-foreground">{title}</h2>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{description}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>

					{/* Plan card */}
					<div className="lg:sticky lg:top-12">
						<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
							<div className="border-b border-border/70 bg-secondary/40 px-7 py-5">
								<div className="flex items-center justify-between">
									<span className="inline-flex items-center gap-2 font-serif text-lg text-card-foreground">
										<Leaf className="h-4 w-4 text-primary" />
										Pro
									</span>
									<span className="rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
										For the long haul
									</span>
								</div>
							</div>

							<div className="px-7 py-7">
								<div className="mb-6 flex justify-center">
									<BillingToggle value={cycle} onChange={setCycle} />
								</div>

								<div className="flex items-end justify-center gap-1.5">
									<span className="font-sans text-5xl font-extrabold tracking-tight text-card-foreground tabular-nums">
										${price.amount}
									</span>
									<span className="pb-1.5 text-sm text-muted-foreground">
										{price.cadence}
									</span>
								</div>
								<p className="mt-2 text-center text-xs text-muted-foreground">
									{price.note}
								</p>

								<div className="mt-7">
									{state === "done" ? (
										<div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
											<p className="flex items-center justify-center gap-2 font-medium text-primary">
												<Check className="h-4 w-4" />
												You're on Pro
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												Thank you for making room for this.
											</p>
										</div>
									) : (
										<Button
											size="lg"
											className="h-11 w-full text-base"
											onClick={handleUpgrade}
											disabled={state === "loading"}
										>
											{state === "loading" ? "One moment…" : "Upgrade to Pro"}
										</Button>
									)}
								</div>

								<p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
									<Lock className="h-3 w-3" />
									Cancel anytime. Your words always stay yours.
								</p>

								<div className="mt-7 border-t border-border/70 pt-6">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										You'll keep everything on Free
									</p>
									<ul className="mt-3 space-y-2">
										{FREE_KEEPS.map((item) => (
											<li
												key={item}
												className="flex items-center gap-2.5 text-sm text-card-foreground"
											>
												<Check className="h-4 w-4 shrink-0 text-primary/70" />
												{item}
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={() => navigate("/settings")}
							className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							Maybe later
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
