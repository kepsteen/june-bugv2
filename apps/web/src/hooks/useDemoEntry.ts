import { useCallback, useState } from 'react';
import type { Entry } from '@/lib/api';

function todayMidnightUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

function createDemoEntry(): Entry {
  const now = new Date().toISOString();
  return {
    id: 'demo',
    userId: 'demo',
    entryDate: todayMidnightUtc(),
    content: '',
    plainText: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function useDemoEntry() {
  const [demoEntry, setDemoEntry] = useState<Entry | null>(null);

  const create = useCallback(() => {
    setDemoEntry(createDemoEntry());
  }, []);

  const update = useCallback((content: string, plainText: string) => {
    setDemoEntry((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content,
        plainText,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const remove = useCallback(() => {
    setDemoEntry(null);
  }, []);

  return { demoEntry, create, update, remove };
}
