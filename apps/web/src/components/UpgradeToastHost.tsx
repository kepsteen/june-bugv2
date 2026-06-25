import { useEffect, useState } from 'react';
import {
  UPGRADE_TOAST_EVENT_NAME,
  type UpgradeToastDetail,
} from '@/lib/upgrade-toast';

export function UpgradeToastHost() {
  const [toast, setToast] = useState<UpgradeToastDetail | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    const handleUpgradeToast = (event: Event) => {
      const detail = (event as CustomEvent<UpgradeToastDetail>).detail;
      setToast(detail);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), 4000);
    };

    window.addEventListener(UPGRADE_TOAST_EVENT_NAME, handleUpgradeToast);
    return () => {
      window.removeEventListener(UPGRADE_TOAST_EVENT_NAME, handleUpgradeToast);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-md"
    >
      {toast.message}
    </div>
  );
}
