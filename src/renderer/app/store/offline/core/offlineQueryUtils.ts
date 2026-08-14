import type { AxiosError } from 'axios';
import { store } from '../../store';
import type { SystemStatus } from '../../slices/networkSlice';

/** Single source of truth: Redux network slice (driven by connectivity probe + browser events). */
export function getSystemStatus(): SystemStatus {
  const state = store.getState();
  return (state as { network?: { systemStatus?: SystemStatus } }).network?.systemStatus ?? 'online';
}

/** Completely offline only. `slow` is reachable - not offline. */
export function isOfflineMode(): boolean {
  return getSystemStatus() === 'offline';
}

export function isCompletelyOffline(): boolean {
  return isOfflineMode() || isBrowserOffline();
}

export function isOnlineMode(): boolean {
  return !isOfflineMode();
}

/** Completely offline → client storage wins. Online/slow → server first. */
export function shouldUseClientStorage(): boolean {
  return isOfflineMode();
}

export function shouldFetchFromServer(): boolean {
  return isOnlineMode();
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * True when completely offline - queue locally instead of waiting on the API.
 * Never use `isNetworkFailure` alone for write fallback: timeouts on slow/flaky links
 * often mean the server already processed the request, which duplicates rows if we also persist locally.
 */
export function shouldCompleteMutationLocally(): boolean {
  return isCompletelyOffline();
}

/** Alias for mutation catch blocks - same rule as {@link shouldCompleteMutationLocally}. */
export function shouldFallbackMutationToLocal(): boolean {
  return shouldCompleteMutationLocally();
}

export function isNetworkFailure(err: unknown): boolean {
  const axiosErr = err as AxiosError;
  return axiosErr.isAxiosError === true && !axiosErr.response;
}

export function isMutationTimeout(err: unknown): boolean {
  const axiosErr = err as AxiosError;
  return axiosErr.isAxiosError === true && axiosErr.code === 'ECONNABORTED';
}

const INDEXED_DB_ERROR_PATTERNS = [
  /IDBDatabase/i,
  /The database connection is closing/i,
  /transaction.*fail/i,
  /indexeddb/i,
  /database connection/i,
  /connection.*closing/i,
];

export function isIndexedDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = (err as Error).message ?? String(err);
  return INDEXED_DB_ERROR_PATTERNS.some((p) => p.test(message));
}

export function sanitizeErrorMessage(err: unknown, fallback: string): string {
  if (isIndexedDbError(err)) return fallback;
  const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const data = axiosErr.response?.data;
  const fieldErrors = data?.errors;
  if (fieldErrors) {
    const firstFieldMessage = Object.values(fieldErrors).flat().find(Boolean);
    if (firstFieldMessage) return firstFieldMessage;
  }
  const serverMessage = data?.message;
  if (serverMessage && serverMessage !== 'Server Error') return serverMessage;
  if (isMutationTimeout(err) && !isCompletelyOffline()) {
    return 'Request timed out. Your action may still be processing - wait and refresh before trying again.';
  }
  if (err instanceof Error && err.message && err.message !== 'Request failed with status code 422') {
    return err.message;
  }
  return fallback;
}
