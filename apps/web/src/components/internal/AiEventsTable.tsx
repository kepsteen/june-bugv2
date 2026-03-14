import { Fragment, useState } from "react";
import { Link } from "react-router";
import { Activity } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AiUsageEvent } from "@/lib/api";
import { formatRelativeTimestamp } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { DetailToggle } from "./DetailToggle";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { formatFeatureLabel } from "./utils";

export function AiEventsTable({
  data,
  isLoading,
}: {
  data: AiUsageEvent[];
  isLoading: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={Activity}
        message="No AI usage events in the selected period."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Time</TableHead>
            <TableHead className="whitespace-nowrap">User</TableHead>
            <TableHead className="whitespace-nowrap">Feature</TableHead>
            <TableHead className="whitespace-nowrap">Model</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap text-right">Tokens In</TableHead>
            <TableHead className="whitespace-nowrap text-right">Tokens Out</TableHead>
            <TableHead className="whitespace-nowrap text-right">Latency</TableHead>
            <TableHead className="whitespace-nowrap text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((event) => {
            const isExpanded = expandedId === event.id;

            return (
              <Fragment key={event.id}>
                <TableRow className="align-top">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatRelativeTimestamp(event.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {event.userId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatFeatureLabel(event.feature)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {event.model}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {(event.tokensInput ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {(event.tokensOutput ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {event.latencyMs}ms
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <DetailToggle
                      expanded={isExpanded}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : event.id)
                      }
                    />
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={9} className="p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            Request context
                          </p>
                          <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
                            {JSON.stringify(
                              event.requestContext ?? {},
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            Error details
                          </p>
                          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                            {event.errorMessage || "No error message recorded."}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
