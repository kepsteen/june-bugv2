import { AlertCircle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
