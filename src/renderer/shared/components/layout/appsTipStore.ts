/**
 * One-time feature tip flag (Notion/Slack/Google pattern): a versioned
 * per-user seen marker. Dismissing retires the tip; bumping TIP_VERSION
 * re-arms it when the feature meaningfully changes.
 */
const STORAGE_PREFIX = 'custosell:apps-tip:';

export const COACHMARK_TARGET_SELECTOR = '[data-tour="header-app-store"]';
export const COACHMARK_SHOW_DELAY_MS = 2_500;

declare const __APP_VERSION__: string | undefined;

/** Tip generation follows the app release - a new version re-arms the tip once. */
export function tipVersion(): string {
  try {
    return typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'v1';
  } catch {
    return 'v1';
  }
}

function storageKey(userId: number | string | null | undefined): string {
  return `${STORAGE_PREFIX}${userId ?? 'anon'}:${tipVersion()}`;
}

/** Exact localStorage key (DevTools → Application → Local Storage). */
export function tipStorageKey(userId: number | string | null | undefined): string {
  return storageKey(userId);
}

/** Due only when this version has never been seen (no weekly resurfacing). */
export function isTipDue(seen: string | null): boolean {
  return !seen;
}

export function readTipSeen(userId: number | string | null | undefined): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function stampTipSeen(userId: number | string | null | undefined): void {
  try {
    localStorage.setItem(storageKey(userId), new Date().toISOString());
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.info(`[AppsTip] shown - stamped ${storageKey(userId)}`);
    }
  } catch {
    /* private mode - tip just shows again next visit */
  }
}

/** Back-compat: retire any pre-version weekly stamp so it never resurfaces. */
export function clearLegacyWeeklyStamp(userId: number | string | null | undefined): void {
  try {
    localStorage.removeItem(`custosell:apps-coachmark:${userId ?? 'anon'}`);
  } catch {
    /* ignore */
  }
}

interface AppsTipDebug {
  version: () => string;
  key: (userId: number | string | null | undefined) => string;
  state: (userId: number | string | null | undefined) => string | null;
  reset: (userId: number | string | null | undefined) => boolean;
}

function currentSeen(userId: number | string | null | undefined): string | null {
  return readTipSeen(userId);
}

// Dev-only inspect handle: window.__appsTip.state(9) to check, .reset(9) +
// reload to see the tip again. Never shipped to production builds.
if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  const debug: AppsTipDebug = {
    version: () => tipVersion(),
    key: (userId) => tipStorageKey(userId),
    state: (userId) => currentSeen(userId),
    reset: (userId) => {
      try {
        const had = localStorage.getItem(tipStorageKey(userId)) !== null;
        localStorage.removeItem(tipStorageKey(userId));
        return had;
      } catch {
        return false;
      }
    },
  };
  (window as unknown as { __appsTip?: AppsTipDebug }).__appsTip = debug;
}
