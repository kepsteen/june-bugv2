import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { PanelLeft, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntriesSidebar } from '@/components/sidebar/EntriesSidebar';
import { PromptsSidebar } from '@/components/sidebar/PromptsSidebar';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { SearchDialog } from '@/components/SearchDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { entriesApi, appUsersApi } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { formatEntryDate, formatSavedTime, countWords } from '@/lib/entry-utils';

const SIDEBAR_WIDTH = 280;

export function EntriesPage() {
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
  const sidebarRef = useRef<HTMLElement | null>(null);
  const isAuthenticated = !!session?.user;

  // Fetch entries list
  const { data: entriesData } = useQuery({
    queryKey: ['entries'],
    queryFn: () => entriesApi.list(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const entries = entriesData?.data ?? [];

  // Fetch current entry
  const { data: entryData, isLoading: entryLoading } = useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => (entryId ? entriesApi.get(entryId) : null),
    enabled: !!entryId && isAuthenticated,
    staleTime: 30_000,
  });
  const currentEntry = entryData?.data ?? null;

  // Fetch app user
  const { data: appUserData } = useQuery({
    queryKey: ['appUser'],
    queryFn: () => appUsersApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Auto-navigate to first entry or create one
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!entryId && entries.length > 0) {
      navigate(`/entries/${entries[0].id}`, { replace: true });
    }
  }, [entries, entryId, isAuthenticated, navigate]);

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, content, plainText }: { id: string; content: string; plainText: string }) =>
      entriesApi.update(id, { content, plainText }),
    onSuccess: (data) => {
      setSavedTime(formatSavedTime(data.data.updatedAt));
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.setQueryData(['entry', entryId], data);
    },
    onError: () => setIsSaving(false),
  });

  // Debounced save
  const [pendingContent, setPendingContent] = useState<{ content: string; plainText: string } | null>(null);
  const [debouncedPending] = useDebounce(pendingContent, 1000, { maxWait: 2000 });

  useEffect(() => {
    if (debouncedPending && entryId) {
      updateMutation.mutate({ id: entryId, ...debouncedPending });
    }
  }, [debouncedPending, entryId]);

  const handleEditorUpdate = useCallback((content: string, plainText: string) => {
    setIsSaving(true);
    setPendingContent({ content, plainText });
  }, []);

  // Create new entry
  const createMutation = useMutation({
    mutationFn: () => entriesApi.create(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      navigate(`/entries/${data.data.id}`);
    },
  });

  const handleNewEntry = () => createMutation.mutate();

  const handleSelectEntry = (id: string) => navigate(`/entries/${id}`);

  const handlePromptsToggle = () => {
    setPromptsOpen((prev) => {
      if (!prev) {
        setWiggle(true);
        setTimeout(() => setWiggle(false), 700);
      }
      return !prev;
    });
  };

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* Left Sidebar */}
      <EntriesSidebar
        entries={entries}
        selectedEntryId={entryId}
        onSelectEntry={handleSelectEntry}
        onNewEntry={handleNewEntry}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sidebarRef={sidebarRef}
        isCollapsed={sidebarCollapsed}
        sidebarWidth={SIDEBAR_WIDTH}
        isAuthenticated={isAuthenticated}
        user={session?.user ? { name: session.user.name, image: session.user.image } : null}
      />

      {/* Resize handle */}
      {!sidebarCollapsed && (
        <div className="w-1 bg-border/50 hover:bg-primary/20 cursor-col-resize transition-colors" />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <div className="flex items-center px-4 h-14 border-b border-border/50 relative">
          {sidebarCollapsed ? (
            <div className="flex items-center gap-1">
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
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          {currentEntry && (
            <div className="flex-1 flex items-center justify-between ml-4">
              <h2 className="text-sm font-semibold text-foreground">
                {formatEntryDate(currentEntry.entryDate)}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {isSaving ? 'Saving...' : savedTime ? `Last saved ${savedTime}` : ''}
                </span>
              </div>
            </div>
          )}

          <div
            className="absolute transition-[right] duration-300 ease-in-out"
            style={{ right: promptsOpen ? 'calc(320px + 0.75rem)' : '0.75rem', top: '0.75rem' }}
          >
            <ThemeToggle />
          </div>
        </div>

        {/* Card area with notch */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 bg-card rounded-tl-lg border-l border-t border-border/50 overflow-hidden flex flex-col relative">
            {/* Top border that stops before notch */}
            {!sidebarCollapsed && (
              <div
                className="absolute top-0 left-0 right-0 h-[0.5px] bg-border"
                style={{ right: '65px', left: '8px' }}
              />
            )}

            {/* Notch SVG */}
            {!sidebarCollapsed && (
              <div className="absolute top-0 right-0">
                <svg
                  className="absolute top-0 right-0 pointer-events-none"
                  style={{ width: '5.25rem', height: '2.5rem' }}
                  viewBox="0 0 96 48"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 96,0 L 0,0 C 20,0 32,9 32,24 C 32,39 44,48 64,48 L 96,48 Z"
                    className="fill-background"
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

            {/* Editor area */}
            <div
              className="flex-1 overflow-y-auto transition-[padding] duration-300 ease-in-out"
              style={{ paddingLeft: promptsOpen ? '14rem' : '4rem', paddingRight: promptsOpen ? '14rem' : '4rem', paddingTop: '1.5rem' }}
            >
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h2 className="text-xl font-semibold mb-2">Welcome to JuneBug</h2>
                  <p className="text-muted-foreground mb-4">Sign in to start journaling</p>
                </div>
              ) : entryLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground text-sm">Loading entry...</div>
                </div>
              ) : currentEntry ? (
                <TiptapEditor
                  key={currentEntry.id}
                  initialContent={currentEntry.content}
                  onUpdate={handleEditorUpdate}
                />
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h2 className="text-xl font-semibold mb-2">No entries yet</h2>
                  <p className="text-muted-foreground mb-4">Create your first journal entry to get started.</p>
                  <Button onClick={handleNewEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Entry
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground text-sm">Select an entry</div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <PromptsSidebar isOpen={promptsOpen} onClose={() => setPromptsOpen(false)} />
        </div>
      </main>

      {/* Floating June Bug button */}
      {isAuthenticated && (
        <button
          onClick={handlePromptsToggle}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full border-2 border-border shadow-lg overflow-hidden bg-card hover:scale-105 transition-transform ${wiggle ? 'animate-happy-wiggle' : ''}`}
          aria-label="Open entry prompts"
          style={{ right: promptsOpen ? 'calc(320px + 1.5rem)' : '1.5rem' }}
        >
          <img
            src="/apple-touch-icon-180x180.png"
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
    </div>
  );
}
