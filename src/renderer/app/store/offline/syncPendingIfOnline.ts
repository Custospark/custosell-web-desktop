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
 * Entry point for offline sync — delegates to the tiered SyncCoordinator.
 */
export async function syncPendingDataIfOnline(): Promise<PendingSyncResult> {
  if (isOfflineMode()) {
    return {
      synced: 0,
      failed: 0,
      stockSynced: 0,
      authSynced: 0,
      authFailed: 0,
      authBlocked: false,
      skipped: true,
      reason: 'offline',
    };
  }

  if (isSyncCoordinatorRunning()) {
    return {
      synced: 0,
      failed: 0,
      stockSynced: 0,
      authSynced: 0,
      authFailed: 0,
      authBlocked: false,
      skipped: true,
      reason: 'in_progress',
    };
  }

  return runSyncCoordinator();
}

export { isSyncCoordinatorRunning };
