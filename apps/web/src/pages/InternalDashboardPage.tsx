import { useMemo, useState } from "react";
import { NavLink, Link, Outlet, useOutletContext, useSearchParams } from "react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getTimeRangeLabel, getRefreshLabel, getSinceISOString } from "@/lib/utils";
import {
  useGetAiEventsQuery,
  useGetAiOverviewQuery,
  useGetPlatformOverviewQuery,
  useGetQueueJobEventsQuery,
  useGetQueueOverviewQuery,
} from "@/hooks/api";
import {
  TIME_RANGE_OPTIONS,
  DEFAULT_TIME_RANGE,
  DEFAULT_REFRESH_VALUE,
  dashboardTabs,
  aiFeatureOptions,
  aiStatusOptions,
  queueStatusOptions,
  queueOutcomeOptions,
  type DashboardContextValue,
} from "@/components/internal/types";
import { buildTabHref } from "@/components/internal/utils";
import {
  ErrorBanner,
  OverviewCardsSkeleton,
  FiltersRow,
  FilterSelect,
  AiOverviewCards,
  AiEventsTable,
  QueueOverviewCards,
  QueueJobEventsTable,
  PlatformOverviewCards,
} from "@/components/internal";

export function useInternalDashboardContext() {
  return useOutletContext<DashboardContextValue>();
}

export function InternalDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedHours = Number(searchParams.get("hours"));
  const [refreshValue, setRefreshValue] = useState(DEFAULT_REFRESH_VALUE);
  const timeRange = TIME_RANGE_OPTIONS.includes(
    parsedHours as (typeof TIME_RANGE_OPTIONS)[number],
  )
    ? parsedHours
    : DEFAULT_TIME_RANGE;
  const refreshInterval =
    refreshValue === DEFAULT_REFRESH_VALUE ? false : Number(refreshValue);

  const setTimeRange = (hours: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("hours", String(hours));
    setSearchParams(nextParams, { replace: true });
  };

  const contextValue = useMemo<DashboardContextValue>(
    () => ({
      timeRange,
      setTimeRange,
      refreshInterval,
    }),
    [refreshInterval, timeRange],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Link
          to="/entries"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to entries
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Internal Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Observability and platform health across AI, queues, and app
              usage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time range:</span>
              <div className="flex gap-1">
                {TIME_RANGE_OPTIONS.map((hours) => (
                  <Button
                    key={hours}
                    size="sm"
                    variant={timeRange === hours ? "default" : "ghost"}
                    onClick={() => setTimeRange(hours)}
                  >
                    {getTimeRangeLabel(hours)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="w-[140px]">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Auto refresh
              </p>
              <Select value={refreshValue} onValueChange={setRefreshValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto refresh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{getRefreshLabel("off")}</SelectItem>
                  <SelectItem value="30000">
                    {getRefreshLabel("30000")}
                  </SelectItem>
                  <SelectItem value="60000">
                    {getRefreshLabel("60000")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {dashboardTabs.map((tab) => (
            <NavLink
              key={tab.value}
              to={buildTabHref(tab.value, searchParams)}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <Outlet context={contextValue} />
      </div>
    </div>
  );
}

export function InternalDashboardAiPage() {
  const { timeRange, refreshInterval } = useInternalDashboardContext();
  const [featureFilter, setFeatureFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const startDate = useMemo(() => getSinceISOString(timeRange), [timeRange]);

  const aiOverview = useGetAiOverviewQuery(timeRange, {
    refetchInterval: refreshInterval,
  });
  const aiEvents = useGetAiEventsQuery(
    {
      limit: 50,
      startDate,
      feature: featureFilter === "all" ? undefined : featureFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { refetchInterval: refreshInterval },
  );

  return (
    <div className="space-y-6">
      {(aiOverview.error || aiEvents.error) && (
        <ErrorBanner message="Error loading AI observability data. Check your permissions or try again." />
      )}

      {aiOverview.data?.data ? (
        <AiOverviewCards data={aiOverview.data.data} />
      ) : (
        <OverviewCardsSkeleton />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent AI Activity</CardTitle>
          <CardDescription>
            Last 50 AI calls in the selected window with filters, token counts,
            and detail payloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltersRow>
            <FilterSelect
              label="Feature"
              value={featureFilter}
              onValueChange={setFeatureFilter}
              options={aiFeatureOptions}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={aiStatusOptions}
            />
          </FiltersRow>

          <AiEventsTable
            data={aiEvents.data?.data ?? []}
            isLoading={aiEvents.isLoading || aiEvents.isFetching}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function InternalDashboardQueuesPage() {
  const { timeRange, refreshInterval } = useInternalDashboardContext();
  const [statusFilter, setStatusFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const startDate = useMemo(() => getSinceISOString(timeRange), [timeRange]);

  const queueOverview = useGetQueueOverviewQuery(timeRange, {
    refetchInterval: refreshInterval,
  });
  const queueJobEvents = useGetQueueJobEventsQuery(
    {
      limit: 50,
      startDate,
      status: statusFilter === "all" ? undefined : statusFilter,
      outcome: outcomeFilter === "all" ? undefined : outcomeFilter,
    },
    { refetchInterval: refreshInterval },
  );

  return (
    <div className="space-y-6">
      {(queueOverview.error || queueJobEvents.error) && (
        <ErrorBanner message="Error loading queue observability data. Check your permissions or try again." />
      )}

      {queueOverview.data?.data ? (
        <QueueOverviewCards data={queueOverview.data.data} />
      ) : (
        <OverviewCardsSkeleton />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Queue Job Events</CardTitle>
          <CardDescription>
            Last 50 queue events in the selected window with outcomes, entry
            links, and job metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltersRow>
            <FilterSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={queueStatusOptions}
            />
            <FilterSelect
              label="Outcome"
              value={outcomeFilter}
              onValueChange={setOutcomeFilter}
              options={queueOutcomeOptions}
            />
          </FiltersRow>

          <QueueJobEventsTable
            data={queueJobEvents.data?.data ?? []}
            isLoading={queueJobEvents.isLoading || queueJobEvents.isFetching}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function InternalDashboardPlatformPage() {
  const { timeRange, refreshInterval } = useInternalDashboardContext();
  const platformOverview = useGetPlatformOverviewQuery(timeRange, {
    refetchInterval: refreshInterval,
  });

  return (
    <div className="space-y-6">
      {platformOverview.error && (
        <ErrorBanner message="Error loading platform overview data. Check your permissions or try again." />
      )}

      {platformOverview.data?.data ? (
        <PlatformOverviewCards data={platformOverview.data.data} />
      ) : (
        <>
          <OverviewCardsSkeleton count={3} />
          <OverviewCardsSkeleton count={3} />
          <OverviewCardsSkeleton count={3} />
        </>
      )}
    </div>
  );
}
