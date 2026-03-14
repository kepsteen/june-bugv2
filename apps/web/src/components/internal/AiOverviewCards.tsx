import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiOverview } from "@/lib/api";
import { SectionHeader } from "./SectionHeader";
import { formatFeatureLabel } from "./utils";

export function AiOverviewCards({ data }: { data: AiOverview }) {
  const { totals, statusBreakdown, featureBreakdown, period } = data;
  const successCount =
    statusBreakdown.find((status) => status.status === "success")?.count || 0;
  const errorCount =
    statusBreakdown.find((status) => status.status === "error")?.count || 0;
  const fallbackCount =
    statusBreakdown.find((status) => status.status === "fallback")?.count || 0;
  const successRate =
    totals.totalCalls > 0
      ? Math.round((successCount / totals.totalCalls) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="AI Usage Overview"
        description={`Last ${period.hours} hours (since ${new Date(period.since).toLocaleString()})`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-2xl">
              {totals.totalCalls.toLocaleString()}
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
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl">{successRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {successCount} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className="text-2xl">{totals.avgLatencyMs}ms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">per request</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fallback/Error</CardDescription>
            <CardTitle className="text-2xl">
              {fallbackCount + errorCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {fallbackCount} fallback, {errorCount} error
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Breakdown</CardTitle>
          <CardDescription>
            Which AI features generated traffic in the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {featureBreakdown.map((feature) => (
            <div key={feature.feature} className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                {formatFeatureLabel(feature.feature)}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {feature.count.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {totals.totalCalls > 0
                  ? `${Math.round((feature.count / totals.totalCalls) * 100)}% of calls`
                  : "No calls in range"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
