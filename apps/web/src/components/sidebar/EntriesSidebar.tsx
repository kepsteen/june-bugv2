import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Search, User, LogIn, MoreHorizontal, Trash2, BarChart3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { groupEntriesByDate, getEntryDisplayTitle, formatEntryDateShort, filterEntriesBySearch } from '@/lib/entry-utils';
import type { Entry } from '@/lib/api';

interface EntriesSidebarProps {
  entries: Entry[];
  selectedEntryId?: string;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sidebarRef: React.RefObject<HTMLElement | null>;
  isCollapsed: boolean;
  sidebarWidth: number;
  isAuthenticated: boolean;
  user?: { name?: string; image?: string | null } | null;
  isAdmin?: boolean;
}

export function EntriesSidebar({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  searchTerm,
  onSearchChange,
  sidebarRef,
  isCollapsed,
  sidebarWidth,
  isAuthenticated,
  user,
  isAdmin,
}: EntriesSidebarProps) {
  const navigate = useNavigate();

  const filteredEntries = filterEntriesBySearch(entries, searchTerm);
  const groupedEntries = groupEntriesByDate(filteredEntries);

  const handleDelete = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    onDeleteEntry(entryId);
  };

  const renderEntryButton = (entry: Entry) => {
    const isSelected = entry.id === selectedEntryId;
    const displayText = getEntryDisplayTitle(entry);

    return (
      <div
        key={entry.id}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        }`}
      >
        <TooltipProvider delayDuration={700}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectEntry(entry.id)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-xs font-medium truncate">{displayText}</div>
                <div className="text-[0.625rem] text-muted-foreground truncate">
                  {formatEntryDateShort(entry.entryDate)}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs -mt-4">
              <p className="text-xs">{displayText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => handleDelete(e, entry.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-sidebar via-sidebar/80 to-transparent pointer-events-none" />
      </div>

      <div className="mt-3 bg-sidebar space-y-1">
        {isAuthenticated ? (
          <>
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
            {isAdmin && (
              <Link
                to="/internal"
                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-xs text-muted-foreground hover:text-sidebar-foreground"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Internal Dashboard</span>
              </Link>
            )}
          </>
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
