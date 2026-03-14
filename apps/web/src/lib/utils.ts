import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeRangeLabel(hours: number) {
  if (hours === 168) return "7d";
  if (hours === 48) return "2d";
  if (hours === 24) return "1d";
  return "1h";
}

export function getRefreshLabel(value: string) {
  if (value === "30000") return "30s";
  if (value === "60000") return "60s";
  return "Off";
}

export function getSinceISOString(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function truncateId(value: string, visibleChars: number = 8) {
  return `${value.slice(0, visibleChars)}...`;
}

export function formatRelativeTimestamp(value: string) {
  const date = new Date(value);
  return `${formatDistanceToNow(date, { addSuffix: true })} (${date.toLocaleString()})`;
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}
