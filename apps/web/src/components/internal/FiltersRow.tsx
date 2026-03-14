import type { ReactNode } from "react";

export function FiltersRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {children}
    </div>
  );
}
