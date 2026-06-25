import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useHotkeys } from 'react-hotkeys-hook';
import { PanelLeft, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntriesSidebar } from '@/components/sidebar/EntriesSidebar';
import { PromptsSidebar, promptCategories } from '@/components/sidebar/PromptsSidebar';
import { MarkdownEditor, type MarkdownEditorHandle } from '@/components/editor/MarkdownEditor';
import { SearchDialog } from '@/components/SearchDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  useGetAllEntriesQuery,
  useGetEntryByIdQuery,
  useCreateEntryMutation,
  useUpdateEntryMutation,
  useDeleteEntryMutation,
} from '@/hooks/api';
import { useGetCurrentAppUserQuery } from '@/hooks/api';
import { promptsApi } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useDemoEntry } from '@/hooks/useDemoEntry';
import { formatEntryDate, formatSavedTime } from '@/lib/entry-utils';

const SIDEBAR_WIDTH = 280;

interface EntriesPageProps {
  demo?: boolean;
}

export function EntriesPage({ demo = false }: EntriesPageProps) {
  const { entryId } = useParams<{ entryId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const isAuthenticated = !!session?.user;
  const { demoEntry, create: createDemoEntry, update: updateDemoEntry, remove: removeDemoEntry } = useDemoEntry();

  // Fetch entries list
  const { data: entriesData } = useGetAllEntriesQuery({
    enabled: isAuthenticated,
  });
  const entries = demo
    ? (demoEntry ? [demoEntry] : [])
    : (isAuthenticated ? (entriesData?.data ?? []) : []);

  // Fetch current entry
  const { data: entryData, isLoading: entryLoading } = useGetEntryByIdQuery(entryId, {
    enabled: isAuthenticated,
  });
  const currentEntry = demo
    ? demoEntry
    : (isAuthenticated ? (entryData?.data ?? null) : null);

  // Fetch app user
  const { data: appUserData } = useGetCurrentAppUserQuery({
    enabled: isAuthenticated,
  });

  // Auto-navigate to first entry or create one
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!entryId && entries.length > 0) {
      navigate(`/entries/${entries[0].id}`, { replace: true });
    }
  }, [entries, entryId, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !currentEntry?.id) return;

    for (const category of promptCategories) {
      void queryClient.prefetchQuery({
        queryKey: ['prompts', 'personalized', currentEntry.id, category.focusCategory],
        queryFn: () =>
          promptsApi.getPersonalized({
            payload: {
              entryId: currentEntry.id,
              focusCategory: category.focusCategory,
              entryDraft: currentEntry.plainText ?? undefined,
            },
          }),
        staleTime: 60_000,
      });
    }
  }, [currentEntry?.id, isAuthenticated, queryClient]);

  // Update entry mutation with success callback
  const updateMutation = useUpdateEntryMutation({
    onSuccess: (data) => {
      setSavedTime(formatSavedTime(data.data.updatedAt));
      setIsSaving(false);
    },
    onError: () => setIsSaving(false),
  });

  // Debounced save - track which entry the pending content belongs to
  const [pendingContent, setPendingContent] = useState<{ content: string; plainText: string; entryId: string | undefined } | null>(null);
  const [debouncedPending] = useDebounce(pendingContent, 1000, { maxWait: 2000 });
  const currentEntryIdRef = useRef(entryId);

  // Keep ref in sync with current entryId
  useEffect(() => {
    currentEntryIdRef.current = entryId;
  }, [entryId]);

  useEffect(() => {
    const belongsToCurrentEntry = debouncedPending && debouncedPending.entryId === currentEntryIdRef.current;
    // Only save if the debounced content belongs to the current entry
    if (belongsToCurrentEntry && entryId) {
      const { entryId: _, ...payload } = debouncedPending;
      updateMutation.mutate({ id: entryId, payload });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate is stable, including updateMutation causes infinite loop
  }, [debouncedPending, entryId]);

  const handleEditorUpdate = useCallback((content: string, plainText: string) => {
    if (demo) {
      updateDemoEntry(content, plainText);
      setSavedTime(formatSavedTime(new Date().toISOString()));
      return;
    }
    const currentId = currentEntryIdRef.current;
    setIsSaving(true);
    // Store the entryId with the content so we can verify it later
    setPendingContent({ content, plainText, entryId: currentId });
  }, [demo, updateDemoEntry]);

  // Create new entry with navigation on success
  const createEntryMutation = useCreateEntryMutation({
    onSuccess: (data) => {
      navigate(`/entries/${data.data.id}`);
    },
    onError: (error) => {
      console.error('Failed to create entry:', error);
    },
  });

  const handleNewEntry = () => {
    if (demo) {
      createDemoEntry();
      return;
    }
    if (!isAuthenticated) {
      navigate('/entries/demo');
      return;
    }
    createEntryMutation.mutate({});
  };

  const handleSelectEntry = (id: string) => navigate(`/entries/${id}`);

  // Delete entry mutation with navigation on success
  const deleteEntryMutation = useDeleteEntryMutation({
    onSuccess: (_, deletedId) => {
      // If we deleted the currently viewed entry, navigate to the first available entry or home
      if (entryId === deletedId) {
        const remainingEntries = entries.filter(e => e.id !== deletedId);
        if (remainingEntries.length > 0) {
          navigate(`/entries/${remainingEntries[0].id}`, { replace: true });
        } else {
          navigate('/entries', { replace: true });
        }
      }
    },
  });

  const handleDeleteEntry = (id: string) => {
    setEntryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (entryToDelete) {
      if (demo) {
        removeDemoEntry();
        setEntryToDelete(null);
        return;
      }
      deleteEntryMutation.mutate(entryToDelete);
      setEntryToDelete(null);
    }
  };

  const handlePromptsToggle = () => {
    setPromptsOpen((prev) => {
      if (!prev) {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 700);
      }
      return !prev;
    });
  };

  const handlePromptClick = useCallback((prompt: string) => {
    editorRef.current?.insertPrompt(prompt);
  }, []);

  // Keyboard shortcuts
  useHotkeys('mod+k', () => {
    setSearchOpen(true);
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });

  useHotkeys('ctrl+6', () => {
    alert('you pressed ctrl p');
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true,
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-sidebar relative">
      {/* Left Sidebar */}
      <EntriesSidebar
        entries={entries}
        selectedEntryId={demo ? demoEntry?.id : entryId}
        onSelectEntry={handleSelectEntry}
        onNewEntry={handleNewEntry}
        onDeleteEntry={handleDeleteEntry}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sidebarRef={sidebarRef}
        isCollapsed={sidebarCollapsed}
        sidebarWidth={SIDEBAR_WIDTH}
        isAuthenticated={isAuthenticated}
        user={session?.user ? { name: session.user.name, image: session.user.image } : null}
        isAdmin={appUserData?.data?.isAdmin}
      />

      {/* Collapse button - sits at top-left of page over sidebar when open */}
      {!sidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-20 h-8 w-8"
          onClick={() => setSidebarCollapsed(true)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Main content */}
      <main className={`flex-1 flex overflow-hidden relative ${sidebarCollapsed ? 'pt-0' : 'pt-2'}`}>
        <div className={`flex-1 bg-card overflow-hidden flex flex-col relative ${sidebarCollapsed ? '' : 'rounded-tl-lg border-l border-border/50'}`}>
          {/* Top border that stops before notch */}
          {!sidebarCollapsed && (
            <div
              className="absolute top-0 left-0 right-0 h-[0.5px] bg-sidebar transition-opacity duration-500 ease-in-out"
              style={{ right: '65px', left: '8px' }}
            />
          )}

          {/* Notch SVG */}
          {!sidebarCollapsed && (
            <div className="absolute top-0 right-0 transition-opacity duration-500 ease-in-out">
              <svg
                className="absolute top-0 right-0 w-21 h-10 pointer-events-none"
                viewBox="0 0 96 48"
                preserveAspectRatio="none"
              >
                <path
                  d="M 96,0 L 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48 Z"
                  className="fill-sidebar"
                />
                <path
                  d="M 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48"
                  className="stroke-border fill-none"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          )}

          {/* Theme toggle - positioned inside the notch when sidebar open, with beige pill when collapsed */}
          <div
            className={`absolute z-10 transition-[top] duration-300 ease-in-out ${sidebarCollapsed ? 'bg-background rounded-lg p-1' : ''}`}
            style={{
              top: sidebarCollapsed ? '0.5rem' : '0.25rem',
              right: '0.5rem',
            }}
          >
            <ThemeToggle />
          </div>

          {/* Collapsed sidebar button group - inside card at top-left with beige pill */}
          {sidebarCollapsed && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-background rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewEntry}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Editor area */}
          <div
            className="flex-1 overflow-y-auto transition-[padding] duration-300 ease-in-out"
            style={{
              paddingLeft: sidebarCollapsed ? '4rem' : '3rem',
              paddingRight: promptsOpen ? '2.5rem' : '4rem',
              paddingTop: sidebarCollapsed ? '3.5rem' : '1.5rem',
            }}
          >
            <div className="mx-auto w-full max-w-4xl">
              {/* Date header and save status */}
              {currentEntry && (
                <div className={`mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 ${sidebarCollapsed ? '' : 'pr-20'}`}>
                  <h2 className="min-w-0 text-2xl font-bold leading-tight text-foreground">
                    {formatEntryDate(currentEntry.entryDate)}
                  </h2>
                  <span className="shrink-0 pt-1 text-xs text-muted-foreground">
                    {isSaving ? 'Saving...' : savedTime ? `Last saved ${savedTime}` : ''}
                  </span>
                </div>
              )}

              {!isAuthenticated && !demo ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <h2 className="mb-2 text-xl font-semibold">Welcome to JuneBug</h2>
                  <p className="mb-4 text-muted-foreground">Sign in to start journaling</p>
                  <Button variant="outline" asChild>
                    <Link to="/entries/demo">Try the demo</Link>
                  </Button>
                </div>
              ) : entryLoading && !demo ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-sm text-muted-foreground">Loading entry...</div>
                </div>
              ) : currentEntry ? (
                <MarkdownEditor
                  ref={editorRef}
                  key={currentEntry.id}
                  entryId={currentEntry.id}
                  initialContent={currentEntry.content}
                  onUpdate={handleEditorUpdate}
                  disableAiTitle={demo}
                />
              ) : entries.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <h2 className="mb-2 text-xl font-semibold">No entries yet</h2>
                  <p className="mb-4 text-muted-foreground">Create your first journal entry to get started.</p>
                  <Button onClick={handleNewEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Entry
                  </Button>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-sm text-muted-foreground">Select an entry</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <PromptsSidebar
          isOpen={promptsOpen}
          onClose={() => setPromptsOpen(false)}
          onPromptClick={handlePromptClick}
          entryId={currentEntry?.id}
          entryDraft={currentEntry?.plainText}
          demo={demo}
        />
      </main>

      {/* Floating June Bug button */}
      {(isAuthenticated || demo) && (
        <button
          onClick={handlePromptsToggle}
          className={`p-2 bg-sidebar fixed bottom-6 right-6 z-50 w-18 h-18 rounded-full border-2 border-border shadow-lg overflow-hidden hover:scale-105 transition-transform ${wiggle ? 'animate-happy-wiggle' : ''}`}
          aria-label="Open entry prompts"
          style={{ right: promptsOpen ? 'calc(320px + 1.5rem)' : '1.5rem' }}
        >
          <img
            src="/june-bug-logo.png"
            alt="JuneBug"
            className="w-full h-full object-cover"
          />
        </button>
      )}

      {/* Search dialog */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        entries={entries}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Entry"
        description="Are you sure you want to permanently delete this entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
