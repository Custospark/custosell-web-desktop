import { isOfflineMode } from './offlineQueryUtils';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { syncAllMutations, processStockAdjustments } from './syncEngine';
import { syncAuthMutations } from './syncAuthEngine';
import { isAuthMutation } from './syncAuthEngine';

export interface PendingSyncResult {
  synced: number;
  failed: number;
  stockSynced: number;
  authSynced: number;
  authFailed: number;
  authBlocked: boolean;
  skipped: boolean;
  reason?: 'offline' | 'empty' | 'in_progress' | 'auth_blocked';
}

let syncInProgress = false;

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
 * Drain auth mutations first, then the rest of the queue when not completely offline.
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

  if (syncInProgress) {
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

  const hasWork = await hasPendingSyncWork();
  if (!hasWork) {
    return {
      synced: 0,
      failed: 0,
      stockSynced: 0,
      authSynced: 0,
      authFailed: 0,
      authBlocked: false,
      skipped: true,
      reason: 'empty',
    };
  }

  syncInProgress = true;
  try {
    const authResult = await syncAuthMutations();
    if (authResult.blocked) {
      return {
        synced: 0,
        failed: 0,
        stockSynced: 0,
        authSynced: authResult.synced,
        authFailed: authResult.failed,
        authBlocked: true,
        skipped: true,
        reason: 'auth_blocked',
      };
    }

    const { synced, failed } = await syncAllMutations();
    const stockSynced = await processStockAdjustments();
    return {
      synced,
      failed,
      stockSynced,
      authSynced: authResult.synced,
      authFailed: authResult.failed,
      authBlocked: false,
      skipped: false,
    };
  } finally {
    syncInProgress = false;
  }
}
