import { Badge } from "@/components/ui/badge";
import { formatLabel } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    success: "default",
    completed: "default",
    error: "destructive",
    failed: "destructive",
    fallback: "secondary",
    published: "secondary",
    processing: "secondary",
    retrying: "outline",
    dead_lettered: "destructive",
    skipped: "outline",
  };

  return (
    <Badge variant={variants[status] || "outline"}>{formatLabel(status)}</Badge>
  );
}
