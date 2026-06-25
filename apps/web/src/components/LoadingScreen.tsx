import { MascotAvatar } from "@/components/MascotAvatar";

export function LoadingScreen() {
	return (
		<div
			className="flex min-h-[min(100dvh,100vh)] items-center justify-center bg-background px-6"
			role="status"
			aria-busy="true"
			aria-label="Loading"
		>
			<div className="flex flex-col items-center text-center">
				<MascotAvatar size="lg" className="mb-8" />
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		</div>
	);
}
