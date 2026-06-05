import { format, subDays, startOfDay } from 'date-fns';
import type { Entry } from './api.js';

function toLocalCalendarDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatEntryDate(dateStr: string): string {
  return format(toLocalCalendarDate(dateStr), 'EEE, MMMM do, yyyy');
}

export function formatEntryDateShort(dateStr: string): string {
  return format(toLocalCalendarDate(dateStr), 'EEE, MMM d');
}

export function formatSavedTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'h:mm a');
}

export function getMidnightTimestamp(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function groupEntriesByDate(entries: Entry[]): {
  last7Days: Entry[];
  last30Days: Entry[];
  older: Entry[];
} {
  const now = new Date();
  const sevenDaysAgo = subDays(startOfDay(now), 7);
  const thirtyDaysAgo = subDays(startOfDay(now), 30);

  const last7Days: Entry[] = [];
  const last30Days: Entry[] = [];
  const older: Entry[] = [];

  for (const entry of entries) {
    const date = toLocalCalendarDate(entry.entryDate);
    if (date >= sevenDaysAgo) {
      last7Days.push(entry);
    } else if (date >= thirtyDaysAgo) {
      last30Days.push(entry);
    } else {
      older.push(entry);
    }
  }

  return { last7Days, last30Days, older };
}

export function filterEntriesBySearch(entries: Entry[], searchTerm: string): Entry[] {
  if (!searchTerm.trim()) return entries;
  const lower = searchTerm.toLowerCase().trim();
  return entries.filter((entry) => {
    const title = (entry.Title || formatEntryDate(entry.entryDate)).toLowerCase();
    const text = (entry.plainText || '').toLowerCase();
    return title.includes(lower) || text.includes(lower);
  });
}

export function getEntryDisplayTitle(entry: Entry): string {
  return entry.Title || formatEntryDate(entry.entryDate);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

export function markdownToPlainText(markdown: string): string {
  if (!markdown.trim()) return '';

  let text = markdown;

  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''),
  );

  text = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\s{2}\n/g, '\n');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}
