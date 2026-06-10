import type { AxiosError } from 'axios';
import { store } from '../store';
import type { SystemStatus } from '../slices/networkSlice';

/** Single source of truth: Redux network slice (driven by connectivity probe + browser events). */
export function getSystemStatus(): SystemStatus {
  const state = store.getState();
  return (state as { network?: { systemStatus?: SystemStatus } }).network?.systemStatus ?? 'online';
}

/** Completely offline only. `slow` is reachable — not offline. */
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

/** True when completely offline — queue locally instead of waiting on the API. */
export function shouldCompleteMutationLocally(): boolean {
  return isCompletelyOffline();
}

export function isNetworkFailure(err: unknown): boolean {
  const axiosErr = err as AxiosError;
  return axiosErr.isAxiosError === true && !axiosErr.response;
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
  const axiosErr = err as AxiosError<{ message?: string }>;
  const serverMessage = axiosErr.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (err instanceof Error) return err.message;
  return fallback;
}
