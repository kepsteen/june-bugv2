const UPGRADE_TOAST_EVENT = 'junebug:upgrade-toast';

export const UPGRADE_TOAST_EVENT_NAME = UPGRADE_TOAST_EVENT;

export function showUpgradeToast(message = 'This feature requires Pro.') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(UPGRADE_TOAST_EVENT, { detail: { message } }),
  );
}

export type UpgradeToastDetail = { message: string };
