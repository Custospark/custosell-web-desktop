import { isOfflineMode } from './offlineQueryUtils';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { runSyncCoordinator, isSyncCoordinatorRunning } from './syncCoordinator';
import { isAuthMutation } from './syncAuthEngine';

export interface PendingSyncResult {
  synced: number;
  failed: number;
  stockSynced: number;
  authSynced: number;
  authFailed: number;
  authBlocked: boolean;
  authPaused?: boolean;
  skipped: boolean;
  reason?: 'offline' | 'empty' | 'in_progress' | 'auth_blocked';
}

const SKIPPED_OFFLINE: PendingSyncResult = {
  synced: 0,
  failed: 0,
  stockSynced: 0,
  authSynced: 0,
  authFailed: 0,
  authBlocked: false,
  skipped: true,
  reason: 'offline',
};

/** Single in-flight coordinator — all callers join the same run (no parallel double-sync). */
let activeSyncRun: Promise<PendingSyncResult> | null = null;

let debouncedSyncHandle: ReturnType<typeof setTimeout> | null = null;

export async function hasPendingSyncWork(): Promise<boolean> {
  const pending = await mutationQueue.getPending();
  const hasAuth = pending.some(isAuthMutation);
  if (hasAuth) return true;

  const mutationCount = await mutationQueue.count();
  if (mutationCount > 0) return true;

  const adjustments = await stockLedger.getPendingAdjustments();
  return adjustments.some((adj) => adj.reason !== 'sale');
}

/**
 * Drain the offline queue once. Concurrent callers await the same coordinator run.
 */
export async function syncPendingDataIfOnline(): Promise<PendingSyncResult> {
  if (isOfflineMode()) {
    return SKIPPED_OFFLINE;
  }

  activeSyncRun ??= runSyncCoordinator().finally(() => {
    activeSyncRun = null;
  });

  return activeSyncRun;
}

/** Debounced enqueue follow-up — use after persisting offline work while online. */
export function requestSyncWhenOnline(): void {
  if (isOfflineMode()) return;

  if (debouncedSyncHandle) {
    clearTimeout(debouncedSyncHandle);
  }

  debouncedSyncHandle = setTimeout(() => {
    debouncedSyncHandle = null;
    void syncPendingDataIfOnline();
  }, 400);
}

export { isSyncCoordinatorRunning };
