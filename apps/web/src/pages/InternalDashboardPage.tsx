import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Activity, Database, Server, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import {
  useGetAiOverviewQuery,
  useGetAiEventsQuery,
  useGetQueueOverviewQuery,
  useGetQueueJobEventsQuery,
} from '@/hooks/api';
import { useState } from 'react';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    completed: 'default',
    error: 'destructive',
    failed: 'destructive',
    fallback: 'secondary',
    published: 'secondary',
    processing: 'secondary',
    retrying: 'outline',
    dead_lettered: 'destructive',
    skipped: 'outline',
  };

  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
}

function AiOverviewCards({ data }: { data: ReturnType<typeof useGetAiOverviewQuery>['data'] }) {
  if (!data?.data) return null;

  const { totals, statusBreakdown, period } = data.data;
  const successCount = statusBreakdown.find((s) => s.status === 'success')?.count || 0;
  const errorCount = statusBreakdown.find((s) => s.status === 'error')?.count || 0;
  const fallbackCount = statusBreakdown.find((s) => s.status === 'fallback')?.count || 0;
  const successRate = totals.totalCalls > 0 ? Math.round((successCount / totals.totalCalls) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Usage Overview</h2>
          <p className="text-sm text-muted-foreground">
            Last {period.hours} hours (since {new Date(period.since).toLocaleString()})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-2xl">{totals.totalCalls.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totals.uniqueUsers} unique users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl">{successRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{successCount} successful</p>
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
            <CardTitle className="text-2xl">{fallbackCount + errorCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{fallbackCount} fallback, {errorCount} error</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AiEventsTable({ data }: { data: ReturnType<typeof useGetAiEventsQuery>['data'] }) {
  if (!data?.data?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No AI usage events in the selected period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium">Time</th>
            <th className="text-left py-2 px-2 font-medium">User</th>
            <th className="text-left py-2 px-2 font-medium">Feature</th>
            <th className="text-left py-2 px-2 font-medium">Model</th>
            <th className="text-left py-2 px-2 font-medium">Status</th>
            <th className="text-right py-2 px-2 font-medium">Latency</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((event) => (
            <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 px-2 text-muted-foreground">
                {new Date(event.createdAt).toLocaleTimeString()}
              </td>
              <td className="py-2 px-2 font-mono text-xs">{event.userId.slice(0, 8)}...</td>
              <td className="py-2 px-2">{event.feature}</td>
              <td className="py-2 px-2 text-muted-foreground">{event.model}</td>
              <td className="py-2 px-2">
                <StatusBadge status={event.status} />
              </td>
              <td className="py-2 px-2 text-right">{event.latencyMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueueOverviewCards({ data }: { data: ReturnType<typeof useGetQueueOverviewQuery>['data'] }) {
  if (!data?.data) return null;

  const { totals, statusBreakdown, outcomeBreakdown, rabbitMq, period } = data.data;
  const completedCount = statusBreakdown.find((s) => s.status === 'completed')?.count || 0;
  const failedCount = statusBreakdown.find((s) => s.status === 'failed')?.count || 0;
  const deadLetterCount = statusBreakdown.find((s) => s.status === 'dead_lettered')?.count || 0;
  const dlqCount = outcomeBreakdown.find((o) => o.outcome === 'max_retries_exceeded')?.count || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Queue Health Overview</h2>
          <p className="text-sm text-muted-foreground">
            Last {period.hours} hours (since {new Date(period.since).toLocaleString()})
          </p>
        </div>
        <Badge variant={rabbitMq.enabled ? 'default' : 'secondary'}>
          <Server className="h-3 w-3 mr-1" />
          {rabbitMq.enabled ? 'RabbitMQ Enabled' : 'RabbitMQ Disabled'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-2xl">{totals.totalJobs.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{totals.uniqueUsers} unique users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1">
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
            <CardTitle className="text-2xl flex items-center gap-1">
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
            <CardTitle className="text-2xl flex items-center gap-1">
              <XCircle className="h-5 w-5 text-red-500" />
              {deadLetterCount + failedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{dlqCount} max retries exceeded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QueueJobEventsTable({ data }: { data: ReturnType<typeof useGetQueueJobEventsQuery>['data'] }) {
  if (!data?.data?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No queue job events in the selected period</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium">Time</th>
            <th className="text-left py-2 px-2 font-medium">Job ID</th>
            <th className="text-left py-2 px-2 font-medium">User</th>
            <th className="text-left py-2 px-2 font-medium">Status</th>
            <th className="text-left py-2 px-2 font-medium">Retries</th>
            <th className="text-left py-2 px-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((event) => (
            <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                {new Date(event.createdAt).toLocaleTimeString()}
              </td>
              <td className="py-2 px-2 font-mono text-xs">{event.jobId.slice(0, 12)}...</td>
              <td className="py-2 px-2 font-mono text-xs">{event.userId.slice(0, 8)}...</td>
              <td className="py-2 px-2">
                <StatusBadge status={event.status} />
              </td>
              <td className="py-2 px-2 text-center">{event.retryCount}</td>
              <td className="py-2 px-2">
                {event.outcome ? (
                  <span className="text-xs text-muted-foreground">{event.outcome}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InternalDashboardPage() {
  const [timeRange, setTimeRange] = useState(24);
  const [activeTab, setActiveTab] = useState('ai');

  const aiOverview = useGetAiOverviewQuery(timeRange);
  const aiEvents = useGetAiEventsQuery({ limit: 50 }, { enabled: activeTab === 'ai' });
  const queueOverview = useGetQueueOverviewQuery(timeRange);
  const queueJobEvents = useGetQueueJobEventsQuery({ limit: 50 }, { enabled: activeTab === 'queues' });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Back link */}
        <Link
          to="/entries"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to entries
        </Link>

        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Internal Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              AI usage and queue health observability
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time range:</span>
              <div className="flex gap-1">
                {[1, 24, 48, 168].map((hours) => (
                  <Button
                    key={hours}
                    variant={timeRange === hours ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeRange(hours)}
                  >
                    {hours === 168 ? '7d' : hours === 48 ? '2d' : hours === 24 ? '1d' : '1h'}
                  </Button>
                ))}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Error handling */}
        {(aiOverview.error || queueOverview.error) && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading dashboard data. Check your permissions.</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="ai">AI Usage</TabsTrigger>
            <TabsTrigger value="queues">Queue Health</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
            <AiOverviewCards data={aiOverview.data} />

            <Card>
              <CardHeader>
                <CardTitle>Recent AI Activity</CardTitle>
                <CardDescription>Last 50 AI calls with status and latency</CardDescription>
              </CardHeader>
              <CardContent>
                <AiEventsTable data={aiEvents.data} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queues" className="space-y-6">
            <QueueOverviewCards data={queueOverview.data} />

            <Card>
              <CardHeader>
                <CardTitle>Recent Queue Job Events</CardTitle>
                <CardDescription>Last 50 job events with status and outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <QueueJobEventsTable data={queueJobEvents.data} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
