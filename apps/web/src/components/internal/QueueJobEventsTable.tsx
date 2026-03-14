import { Fragment, useState } from "react";
import { Link } from "react-router";
import { Database } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueueJobEvent } from "@/lib/api";
import { formatRelativeTimestamp, formatLabel } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { DetailToggle } from "./DetailToggle";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";

export function QueueJobEventsTable({
  data,
  isLoading,
}: {
  data: QueueJobEvent[];
  isLoading: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={Database}
        message="No queue job events in the selected period."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Time</TableHead>
            <TableHead className="whitespace-nowrap">Job ID</TableHead>
            <TableHead className="whitespace-nowrap">Entry</TableHead>
            <TableHead className="whitespace-nowrap">User</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap text-center">Retries</TableHead>
            <TableHead className="whitespace-nowrap">Outcome</TableHead>
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
                    {event.jobId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {event.entryId ? (
                      <Link
                        to={`/entries/${event.entryId}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {event.entryId}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {event.userId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {event.retryCount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {event.outcome ? formatLabel(event.outcome) : "-"}
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
                    <TableCell colSpan={8} className="p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-medium">
                            Job metadata
                          </p>
                          <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
                            {JSON.stringify(event.metadata ?? {}, null, 2)}
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
