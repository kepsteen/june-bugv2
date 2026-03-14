import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  rightSlot,
}: {
  title: string;
  description: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rightSlot}
    </div>
  );
}
