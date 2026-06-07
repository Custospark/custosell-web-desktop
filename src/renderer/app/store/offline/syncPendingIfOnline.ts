import { isOfflineMode } from './offlineQueryUtils';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { syncAllMutations, processStockAdjustments } from './syncEngine';

export interface PendingSyncResult {
  synced: number;
  failed: number;
  stockSynced: number;
  skipped: boolean;
  reason?: 'offline' | 'empty' | 'in_progress';
}

let syncInProgress = false;

export async function hasPendingSyncWork(): Promise<boolean> {
  const mutationCount = await mutationQueue.count();
  if (mutationCount > 0) return true;

  const adjustments = await stockLedger.getPendingAdjustments();
  return adjustments.some((adj) => adj.reason !== 'sale');
}

/**
 * Drain the mutation queue when not completely offline (online or slow).
 * No-op when completely offline or when there is nothing pending.
 */
export async function syncPendingDataIfOnline(): Promise<PendingSyncResult> {
  if (isOfflineMode()) {
    return { synced: 0, failed: 0, stockSynced: 0, skipped: true, reason: 'offline' };
  }

  if (syncInProgress) {
    return { synced: 0, failed: 0, stockSynced: 0, skipped: true, reason: 'in_progress' };
  }

  const hasWork = await hasPendingSyncWork();
  if (!hasWork) {
    return { synced: 0, failed: 0, stockSynced: 0, skipped: true, reason: 'empty' };
  }

  syncInProgress = true;
  try {
    const { synced, failed } = await syncAllMutations();
    const stockSynced = await processStockAdjustments();
    return { synced, failed, stockSynced, skipped: false };
  } finally {
    syncInProgress = false;
  }
}
