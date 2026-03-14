import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlatformOverview } from "@/lib/api";
import { SectionHeader } from "./SectionHeader";
import { formatLabel } from "@/lib/utils";

export function PlatformOverviewCards({ data }: { data: PlatformOverview }) {
  const activeMemories =
    data.memories.statusBreakdown.find((status) => status.status === "active")
      ?.count || 0;
  const recentMemoryEvents = data.memories.eventBreakdown.reduce(
    (total, event) => total + event.count,
    0,
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform Overview"
        description={`Last ${data.period.hours} hours (since ${new Date(data.period.since).toLocaleString()})`}
      />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Users
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl">
                {data.users.totalUsers.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Onboarded Users</CardDescription>
              <CardTitle className="text-2xl">
                {data.users.onboardedUsers.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Onboarding Completion</CardDescription>
              <CardTitle className="text-2xl">
                {data.users.onboardedRate}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Content
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Entries</CardDescription>
              <CardTitle className="text-2xl">
                {data.entries.totalEntries.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Entries In Window</CardDescription>
              <CardTitle className="text-2xl">
                {data.entries.entriesInPeriod.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tags</CardDescription>
              <CardTitle className="text-2xl">
                {data.tags.totalTags.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {data.tags.systemGeneratedTags} system,{" "}
                {data.tags.userGeneratedTags} user-created
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Memories
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Memories</CardDescription>
              <CardTitle className="text-2xl">
                {data.memories.totalMemories.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Memories</CardDescription>
              <CardTitle className="text-2xl">
                {activeMemories.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Memory Events In Window</CardDescription>
              <CardTitle className="text-2xl">
                {recentMemoryEvents.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Memory Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.memories.statusBreakdown.map((status) => (
                <Badge key={status.status} variant="outline">
                  {formatLabel(status.status)}: {status.count}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Memory Events</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.memories.eventBreakdown.length > 0 ? (
                data.memories.eventBreakdown.map((event) => (
                  <Badge key={event.eventType} variant="outline">
                    {formatLabel(event.eventType)}: {event.count}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No memory events recorded in the selected window.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
