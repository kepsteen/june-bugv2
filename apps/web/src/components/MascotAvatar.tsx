import { useState } from "react";
import { cn } from "@/lib/utils";

export const MASCOT_SRC = "/june-bug-logo.png";

function MascotFallback() {
	return (
		<div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-3xl select-none">
			🪲
		</div>
	);
}

export function MascotAvatar({
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
