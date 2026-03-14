import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DetailToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {expanded ? (
        <>
          Hide <ChevronUp className="ml-1 h-4 w-4" />
        </>
      ) : (
        <>
          Details <ChevronDown className="ml-1 h-4 w-4" />
        </>
      )}
    </Button>
  );
}
