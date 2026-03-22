import { Fragment, useEffect, useRef, useState } from "react";
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
  const lastFingerprintRef = useRef<string>("");

  useEffect(() => {
    if (isLoading || data.length === 0) return;
    const fingerprint = `${data[0]?.id ?? "none"}:${data.length}`;
    if (lastFingerprintRef.current === fingerprint) return;
    lastFingerprintRef.current = fingerprint;
    const missingTokenCount = data.filter(
      (event) => event.tokensInput == null && event.tokensOutput == null,
    ).length;
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/bb84193f-a8cf-4886-a1ac-4ac7dc26e58e", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6bb92e",
      },
      body: JSON.stringify({
        sessionId: "6bb92e",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "apps/web/src/components/internal/AiEventsTable.tsx:useEffect",
        message: "AI events table token render inputs",
        data: {
          count: data.length,
          missingTokenCount,
          firstEventId: data[0]?.id ?? null,
          firstTokensInput: data[0]?.tokensInput ?? null,
          firstTokensOutput: data[0]?.tokensOutput ?? null,
          newestCreatedAt: data[0]?.createdAt ?? null,
          oldestCreatedAt: data[data.length - 1]?.createdAt ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [data, isLoading]);

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
