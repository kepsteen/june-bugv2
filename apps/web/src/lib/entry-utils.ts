import { format, isWithinInterval, subDays, startOfDay } from 'date-fns';
import type { Entry } from './api.js';

export function formatEntryDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'EEE, MMMM do, yyyy');
}

export function formatEntryDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'EEE, MMM d');
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
    const date = new Date(entry.entryDate);
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

export function getTiptapText(content: string): string {
  try {
    const json = JSON.parse(content);
    return extractText(json);
  } catch {
    return '';
  }
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content) {
    return node.content.map(extractText).join(' ');
  }
  return '';
}
