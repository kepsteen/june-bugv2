import { useMemo, useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteMemoriesMutation,
  useDeleteMemoryMutation,
  useGetMemoriesQuery,
} from '@/hooks/api';
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

function getStatusLabel(status: MemoryStatus): string {
  return memoryStatuses.find((item) => item.value === status)?.label ?? status;
}

function getStatusBadgeVariant(status: MemoryStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default';
  if (status === 'stale') return 'secondary';
  return 'outline';
}

function MemoryRow({
  memory,
  isDeleting,
  onRemove,
}: {
  memory: UserMemory;
  isDeleting: boolean;
  onRemove: (memory: UserMemory) => void;
}) {
  return (
    <div className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{memory.title}</h3>
          <Badge variant="outline">{getCategoryLabel(memory.category)}</Badge>
          <Badge variant={getStatusBadgeVariant(memory.status)}>
            {getStatusLabel(memory.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{memory.summary}</p>
        <p className="text-xs text-muted-foreground">Last seen {formatDate(memory.lastSeenAt)}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
            disabled={isDeleting}
            aria-label={`Actions for ${memory.title}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={isDeleting}
            onClick={() => onRemove(memory)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Removing...' : 'Remove memory'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function MemoriesTab() {
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MemoryStatus | 'all'>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<UserMemory | null>(null);
  const [singleDeleteOpen, setSingleDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all';

  const filters = useMemo(
    () => ({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [categoryFilter, statusFilter],
  );

  const memoriesQuery = useGetMemoriesQuery(filters);
  const allMemoriesQuery = useGetMemoriesQuery(undefined, {
    enabled: hasActiveFilters && !memoriesQuery.isPending,
  });
  const deleteMemoryMutation = useDeleteMemoryMutation();
  const deleteMemoriesMutation = useDeleteMemoriesMutation();

  const memories = memoriesQuery.data?.data ?? [];
  const isDeleting = pendingDeleteId !== null || deleteMemoriesMutation.isPending;

  const handleRemoveClick = (memory: UserMemory) => {
    setMemoryToDelete(memory);
    setSingleDeleteOpen(true);
  };

  const handleConfirmSingleDelete = async () => {
    if (!memoryToDelete) return;

    try {
      setPendingDeleteId(memoryToDelete.id);
      await deleteMemoryMutation.mutateAsync(memoryToDelete.id);
      setMemoryToDelete(null);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleConfirmBulkDelete = () => {
    deleteMemoriesMutation.mutate(filters);
  };

  const bulkButtonLabel = hasActiveFilters
    ? `Remove ${memories.length} shown ${memories.length === 1 ? 'memory' : 'memories'}`
    : `Remove all memories (${memories.length})`;

  const bulkDialogDescription = hasActiveFilters
    ? `Permanently remove the ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} matching your filters? This cannot be undone.`
    : `Permanently remove all ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}? This cannot be undone.`;

  const emptyMessage = (() => {
    if (hasActiveFilters) {
      const totalCount = allMemoriesQuery.data?.data.length ?? 0;
      if (allMemoriesQuery.isSuccess && totalCount === 0) {
        return 'You don\u2019t have any memories yet.';
      }
      return 'No memories matched the selected filters.';
    }
    return 'You don\u2019t have any memories yet.';
  })();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Memories</h3>
        <p className="text-sm text-muted-foreground">
          Review what June remembers about you. Remove anything that no longer fits.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="memory-category-filter" className="text-sm font-medium">
            Category
          </label>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as MemoryCategory | 'all')}
          >
            <SelectTrigger id="memory-category-filter">
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
          <label htmlFor="memory-status-filter" className="text-sm font-medium">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as MemoryStatus | 'all')}
          >
            <SelectTrigger id="memory-status-filter">
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
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {memoriesQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-foreground">Couldn&apos;t load your memories.</p>
          <p className="mt-1 text-sm text-muted-foreground">{memoriesQuery.error.message}</p>
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
        <p className="py-6 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : null}

      {!memoriesQuery.isPending && !memoriesQuery.isError && memories.length > 0 ? (
        <div className="divide-y">
          {memories.map((memory) => (
            <MemoryRow
              key={memory.id}
              memory={memory}
              isDeleting={pendingDeleteId === memory.id}
              onRemove={handleRemoveClick}
            />
          ))}
        </div>
      ) : null}

      {!memoriesQuery.isPending && !memoriesQuery.isError && memories.length > 0 ? (
        <div className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isDeleting}
            onClick={() => setBulkDeleteOpen(true)}
          >
            {deleteMemoriesMutation.isPending ? 'Removing...' : bulkButtonLabel}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={singleDeleteOpen}
        onOpenChange={(open) => {
          setSingleDeleteOpen(open);
          if (!open) setMemoryToDelete(null);
        }}
        title="Remove memory?"
        description={
          memoryToDelete
            ? `Permanently remove "${memoryToDelete.title}"? This cannot be undone.`
            : 'Permanently remove this memory? This cannot be undone.'
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => void handleConfirmSingleDelete()}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={hasActiveFilters ? 'Remove shown memories?' : 'Remove all memories?'}
        description={bulkDialogDescription}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
