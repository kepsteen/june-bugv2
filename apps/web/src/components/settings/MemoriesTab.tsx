import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteMemoryMutation, useGetMemoriesQuery } from '@/hooks/api';
import type { MemoryCategory, MemoryStatus, UserMemory } from '@/lib/api';

const memoryCategories: Array<{ value: MemoryCategory; label: string }> = [
  { value: 'goal', label: 'Goal' },
  { value: 'project', label: 'Project' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'win', label: 'Win' },
  { value: 'learning', label: 'Learning' },
  { value: 'skill_growth', label: 'Skill growth' },
  { value: 'preference', label: 'Preference' },
  { value: 'habit', label: 'Habit' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'value', label: 'Value' },
  { value: 'other', label: 'Other' },
];

const memoryStatuses: Array<{ value: MemoryStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'stale', label: 'Stale' },
  { value: 'archived', label: 'Archived' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCategoryLabel(category: MemoryCategory): string {
  return memoryCategories.find((item) => item.value === category)?.label ?? category;
}

function getStatusBadgeVariant(status: MemoryStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'stale') return 'secondary';
  return 'outline';
}

function MemoryRow({
  memory,
  isDeleting,
  onDelete,
}: {
  memory: UserMemory;
  isDeleting: boolean;
  onDelete: (memory: UserMemory) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{memory.title}</h3>
            <Badge variant="outline">{getCategoryLabel(memory.category)}</Badge>
            <Badge variant={getStatusBadgeVariant(memory.status)}>{memory.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{memory.summary}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Last seen {formatDate(memory.lastSeenAt)}</span>
            <span>Importance {Math.round(memory.importance * 100)}%</span>
            <span>Confidence {Math.round(memory.confidence * 100)}%</span>
          </div>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={() => onDelete(memory)}
        >
          {isDeleting ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    </div>
  );
}

export function MemoriesTab() {
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | 'all'>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [categoryFilter, statusFilter],
  );

  const memoriesQuery = useGetMemoriesQuery(filters);
  const deleteMemoryMutation = useDeleteMemoryMutation();

  const memories = memoriesQuery.data?.data ?? [];

  const handleDelete = async (memory: UserMemory) => {
    const confirmed = window.confirm(
      `Permanently remove "${memory.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setPendingDeleteId(memory.id);
      await deleteMemoryMutation.mutateAsync(memory.id);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Memories</h3>
        <p className="text-sm text-muted-foreground">
          Review the memories June keeps for you and permanently remove any that no longer fit.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </label>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as MemoryCategory | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {memoryCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as MemoryStatus | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {memoryStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {memoriesQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {memoriesQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-foreground">Couldn&apos;t load your memories.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {memoriesQuery.error.message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void memoriesQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {!memoriesQuery.isPending && !memoriesQuery.isError && memories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No memories matched the selected filters.
        </div>
      ) : null}

      {!memoriesQuery.isPending && !memoriesQuery.isError && memories.length > 0 ? (
        <div className="space-y-3">
          {memories.map((memory) => (
            <MemoryRow
              key={memory.id}
              memory={memory}
              isDeleting={pendingDeleteId === memory.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
