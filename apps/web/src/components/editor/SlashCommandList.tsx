import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { CommandItem } from './SlashCommand';
import { cn } from '@/lib/utils';

interface SlashCommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const SlashCommandList = forwardRef<any, SlashCommandListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => selectItem(selectedIndex);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true; }
      if (event.key === 'ArrowDown') { downHandler(); return true; }
      if (event.key === 'Enter') { enterHandler(); return true; }
      return false;
    },
  }));

  return (
    <div className="slash-command-menu z-50 max-h-[min(80vh,24rem)] w-72 overflow-y-auto rounded-lg border p-1 shadow-md">
      {props.items.length ? (
        props.items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                'hover:bg-secondary',
                index === selectedIndex && 'bg-secondary',
              )}
              onClick={() => selectItem(index)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-secondary">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-foreground/70">{item.description}</p>
              </div>
            </button>
          );
        })
      ) : (
        <div className="px-3 py-2 text-sm text-foreground/70">No results</div>
      )}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';
