import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { groupEntriesByDate, getEntryDisplayTitle, formatEntryDateShort, filterEntriesBySearch } from '@/lib/entry-utils';
import type { Entry } from '@/lib/api';

interface EntriesSidebarProps {
  entries: Entry[];
  selectedEntryId?: string;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sidebarRef: React.RefObject<HTMLElement | null>;
  isCollapsed: boolean;
  sidebarWidth: number;
  isAuthenticated: boolean;
  user?: { name?: string; image?: string | null } | null;
}

export function EntriesSidebar({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  searchTerm,
  onSearchChange,
  sidebarRef,
  isCollapsed,
  sidebarWidth,
  isAuthenticated,
  user,
}: EntriesSidebarProps) {
  const navigate = useNavigate();

  const filteredEntries = filterEntriesBySearch(entries, searchTerm);
  const groupedEntries = groupEntriesByDate(filteredEntries);

  const renderEntryButton = (entry: Entry) => {
    const isSelected = entry.id === selectedEntryId;
    const displayText = getEntryDisplayTitle(entry);

    return (
      <button
        key={entry.id}
        onClick={() => onSelectEntry(entry.id)}
        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        }`}
      >
        <div className="text-sm font-medium truncate">{displayText}</div>
        <div className="text-xs text-muted-foreground truncate">
          {formatEntryDateShort(entry.entryDate)}
        </div>
      </button>
    );
  };

  return (
    <aside
      ref={sidebarRef as React.RefObject<HTMLElement>}
      className="bg-sidebar transition-[width,padding] duration-300 ease-in-out overflow-hidden flex flex-col"
      style={{
        width: isCollapsed ? '0px' : `${sidebarWidth}px`,
        padding: isCollapsed ? '0' : '1rem',
        paddingTop: isCollapsed ? '0' : '3.5rem',
      }}
    >
      <h1 className="text-2xl font-bold mb-2 text-center text-sidebar-foreground">JuneBug</h1>

      {!isAuthenticated && (
        <div className="flex justify-center mb-3">
          <Badge variant="secondary" className="text-xs">Demo Mode</Badge>
        </div>
      )}

      <Button className="w-full mb-3" size="default" onClick={onNewEntry}>
        <Plus className="h-4 w-4 mr-2" />
        New Entry
      </Button>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="search your entries"
          className="pl-9"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="h-full overflow-y-auto pb-2 scrollbar-hide">
          {filteredEntries.length === 0 && (
            <div className="text-sm text-muted-foreground px-2 py-4">
              {searchTerm ? 'No entries found' : 'No entries yet'}
            </div>
          )}

          {groupedEntries.last7Days.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Last 7 Days</h3>
              <div className="space-y-1">{groupedEntries.last7Days.map(renderEntryButton)}</div>
            </div>
          )}

          {groupedEntries.last30Days.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Last 30 Days</h3>
              <div className="space-y-1">{groupedEntries.last30Days.map(renderEntryButton)}</div>
            </div>
          )}

          {groupedEntries.older.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">Older</h3>
              <div className="space-y-1">{groupedEntries.older.map(renderEntryButton)}</div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent pointer-events-none" />
      </div>

      <div className="mt-3 bg-sidebar">
        {isAuthenticated ? (
          <Link
            to="/settings"
            className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.image || ''} alt="User avatar" />
              <AvatarFallback className="bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate text-sidebar-foreground">
              {user?.name || 'User'}
            </span>
          </Link>
        ) : (
          <Button variant="default" className="w-full" onClick={() => navigate('/sign-in')}>
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}
      </div>
    </aside>
  );
}
