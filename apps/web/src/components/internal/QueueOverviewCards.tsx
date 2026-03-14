import { CheckCircle, RefreshCw, Server, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QueueOverview } from "@/lib/api";
import { SectionHeader } from "./SectionHeader";
import { formatLabel } from "@/lib/utils";

export function QueueOverviewCards({ data }: { data: QueueOverview }) {
  const { totals, statusBreakdown, outcomeBreakdown, rabbitMq, period } = data;
  const completedCount =
    statusBreakdown.find((status) => status.status === "completed")?.count || 0;
  const failedCount =
    statusBreakdown.find((status) => status.status === "failed")?.count || 0;
  const deadLetterCount =
    statusBreakdown.find((status) => status.status === "dead_lettered")
      ?.count || 0;
  const dlqCount =
    outcomeBreakdown.find(
      (outcome) => outcome.outcome === "max_retries_exceeded",
    )?.count || 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Queue Health Overview"
        description={`Last ${period.hours} hours (since ${new Date(period.since).toLocaleString()})`}
        rightSlot={
          <Badge variant={rabbitMq.enabled ? "default" : "secondary"}>
            <Server className="mr-1 h-3 w-3" />
            {rabbitMq.enabled ? "RabbitMQ Enabled" : "RabbitMQ Disabled"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-2xl">
              {totals.totalJobs.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totals.uniqueUsers} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="flex items-center gap-1 text-2xl">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {completedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">successful jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Retries</CardDescription>
            <CardTitle className="flex items-center gap-1 text-2xl">
              <RefreshCw className="h-5 w-5 text-yellow-500" />
              {totals.avgRetries}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">per job</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>DLQ / Failed</CardDescription>
            <CardTitle className="flex items-center gap-1 text-2xl">
              <XCircle className="h-5 w-5 text-red-500" />
              {deadLetterCount + failedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {dlqCount} max retries exceeded
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outcome Breakdown</CardTitle>
          <CardDescription>
            How queue jobs resolved after processing and retries.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {outcomeBreakdown.length > 0 ? (
            outcomeBreakdown.map((outcome) => (
              <div
                key={outcome.outcome ?? "unknown"}
                className="rounded-lg border p-4"
              >
                <p className="text-sm font-medium capitalize">
                  {formatLabel(outcome.outcome ?? "unknown")}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {outcome.count.toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              No job outcomes recorded in the selected window.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
