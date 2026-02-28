import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { getEntryDisplayTitle, formatEntryDateShort } from '@/lib/entry-utils';
import type { Entry } from '@/lib/api';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: Entry[];
}

export function SearchDialog({ open, onOpenChange, entries }: SearchDialogProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredEntries = entries.filter((entry) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    const title = getEntryDisplayTitle(entry).toLowerCase();
    const text = (entry.plainText || '').toLowerCase();
    return title.includes(lower) || text.includes(lower);
  });

  const handleSelect = (entryId: string) => {
    navigate(`/entries/${entryId}`);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Entries</DialogTitle>
          <DialogDescription>Search through your journal entries</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg">
          <CommandInput
            placeholder="Search entries..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No entries found.</CommandEmpty>
            <CommandGroup heading="Entries">
              {filteredEntries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`${getEntryDisplayTitle(entry)} ${entry.plainText || ''}`}
                  onSelect={() => handleSelect(entry.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{getEntryDisplayTitle(entry)}</span>
                    <span className="text-xs text-muted-foreground">{formatEntryDateShort(entry.entryDate)}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
