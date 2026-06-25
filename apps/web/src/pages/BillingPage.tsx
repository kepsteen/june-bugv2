import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
	ArrowLeft,
	Check,
	CreditCard,
	ExternalLink,
	Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	useCreatePortalMutation,
	useInvalidateSubscription,
	useSubscriptionQuery,
} from '@/hooks/api/useSubscriptions';
import {
	getSubscriptionPeriodEndDate,
	getSubscriptionPeriodEndLabel,
	isActiveSubscription,
	isSubscriptionScheduledToCancel,
} from '@/lib/api';
import { cn } from '@/lib/utils';

function formatRenewalDate(value: string): string {
	return new Date(value).toLocaleDateString(undefined, {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatStatusLabel(status: string): string {
	return status.replace(/_/g, ' ');
}

export function BillingPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const checkoutResult = searchParams.get('checkout');
	const invalidateSubscription = useInvalidateSubscription();
	const [portalError, setPortalError] = useState<string | null>(null);

	const { data, isPending, isError } = useSubscriptionQuery();
	const subscription = data?.data ?? null;
	const isPro = isActiveSubscription(subscription);
	const isCanceling = isSubscriptionScheduledToCancel(subscription);

	const portalMutation = useCreatePortalMutation({
		onSuccess: (response) => {
			window.location.href = response.data;
		},
		onError: (error) => {
			setPortalError(error.message);
		},
	});

	useEffect(() => {
		if (checkoutResult === 'success') {
			void invalidateSubscription();
		}
	}, [checkoutResult, invalidateSubscription]);

	const dismissCheckoutBanner = () => {
		const next = new URLSearchParams(searchParams);
		next.delete('checkout');
		setSearchParams(next, { replace: true });
	};

	const handleManageSubscription = () => {
		setPortalError(null);
		portalMutation.mutate();
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
				<Link
					to="/settings"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to settings
				</Link>

				<div className="mt-8">
					<h1 className="text-2xl font-bold">Billing</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Manage your JuneBug Pro subscription and payment details.
					</p>
				</div>

				{checkoutResult === 'success' && (
					<div
						className="mt-6 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3"
						role="status"
					>
						<p className="flex items-center gap-2 font-medium text-primary">
							<Check className="h-4 w-4" />
							You're on Pro — thank you for making room for this.
						</p>
						<button
							type="button"
							onClick={dismissCheckoutBanner}
							className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
						>
							Dismiss
						</button>
					</div>
				)}

				{checkoutResult === 'cancelled' && (
					<div
						className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
						role="status"
					>
						Checkout was cancelled. No charge was made.
						<button
							type="button"
							onClick={dismissCheckoutBanner}
							className="ml-2 underline-offset-2 hover:underline"
						>
							Dismiss
						</button>
					</div>
				)}

				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<CreditCard className="h-4 w-4 text-primary" />
							Current plan
						</CardTitle>
						<CardDescription>
							{isPro && isCanceling
								? 'Your Pro subscription is scheduled to end.'
								: isPro
									? 'Your Pro subscription is active.'
									: "You're on the free plan."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						{isPending ? (
							<p className="text-sm text-muted-foreground">Loading billing…</p>
						) : isError ? (
							<p className="text-sm text-destructive">
								Couldn't load billing details. Try again in a moment.
							</p>
						) : isPro && subscription ? (
							<div className="space-y-4">
								<div className="flex flex-wrap items-center gap-2">
									<span className="inline-flex items-center gap-2 font-serif text-lg">
										<Sparkles className="h-4 w-4 text-primary" />
										Pro
									</span>
									<Badge
										variant="secondary"
										className={cn(
											'capitalize',
											isCanceling
												? 'bg-muted text-muted-foreground'
												: subscription.stripeStatus === 'active' &&
														'bg-primary/12 text-primary',
										)}
									>
										{isCanceling ? 'Cancelling' : formatStatusLabel(subscription.stripeStatus)}
									</Badge>
								</div>
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{getSubscriptionPeriodEndLabel(subscription)}
									</p>
									<p className="mt-0.5 text-sm">
										{formatRenewalDate(
											getSubscriptionPeriodEndDate(subscription).toISOString(),
										)}
									</p>
								</div>
								{isCanceling && (
									<p className="text-sm text-muted-foreground">
										You cancelled your subscription. Pro stays available until this
										date, then your account returns to the free plan.
									</p>
								)}
								<Button
									variant="outline"
									onClick={handleManageSubscription}
									disabled={portalMutation.isPending}
								>
									<ExternalLink className="h-4 w-4" />
									{portalMutation.isPending
										? 'Opening portal…'
										: 'Manage subscription'}
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<p className="text-sm text-muted-foreground">
									Upgrade to Pro for unlimited memories, personalized prompts,
									and AI-assisted titles.
								</p>
								<Button onClick={() => navigate('/upgrade')}>
									<Sparkles className="h-4 w-4" />
									Upgrade to Pro
								</Button>
							</div>
						)}

						{portalError && (
							<p className="text-sm text-destructive">{portalError}</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
