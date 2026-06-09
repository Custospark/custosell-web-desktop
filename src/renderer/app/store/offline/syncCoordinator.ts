import { isOfflineMode } from './offlineQueryUtils';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { runSyncPipeline } from './syncEngine';
import { syncAuthMutations } from './syncAuthEngine';
import { isAuthMutation } from './syncAuthEngine';
import { createSyncProgressReporter } from './syncProgressReporter';
import { AuthSyncPauseError } from './syncErrorUtils';
import { store } from '../store';
import {
  syncPaused,
  syncRunCompleted,
  syncRunFailed,
  syncRunStarted,
  syncResumed,
  syncTierChanged,
} from '../slices/syncSlice';
import { SYNC_TIER_LABELS } from './syncConstants';
import { invalidateAfterFullSync } from './syncCacheRefresh';
import type { PendingSyncResult } from './syncPendingIfOnline';

let coordinatorRunning = false;

async function countPendingWorkItems(): Promise<number> {
  const pending = await mutationQueue.getPending();
  const nonAuth = pending.filter((m) => !isAuthMutation(m));
  const adjustments = await stockLedger.getPendingAdjustments();
  const stockCount = adjustments.filter((adj) => adj.reason !== 'sale').length;
  return nonAuth.length + stockCount;
}

export function isSyncCoordinatorRunning(): boolean {
  return coordinatorRunning;
}

/**
 * Drains the offline queue in ordered tiers. Loops until empty or offline.
 * New mutations enqueued while syncing are picked up on the next cycle.
 */
export async function runSyncCoordinator(): Promise<PendingSyncResult> {
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

  if (coordinatorRunning) {
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

  const initialWork = await countPendingWorkItems();
  const pendingAuth = (await mutationQueue.getPending()).some(isAuthMutation);
  if (initialWork === 0 && !pendingAuth) {
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

  coordinatorRunning = true;
  const reporter = createSyncProgressReporter();
  let shouldRefreshCache = false;

  let synced = 0;
  let failed = 0;
  let stockSynced = 0;
  let authSynced = 0;
  let authFailed = 0;
  let authBlocked = false;
  let authPaused = false;

  store.dispatch(syncRunStarted({ totalPending: initialWork + (pendingAuth ? 1 : 0) }));

  try {
    while (true) {
      if (isOfflineMode()) {
        store.dispatch(syncPaused());
        break;
      }

      if (store.getState().sync.status === 'paused') {
        store.dispatch(syncResumed());
      }

      const hasAuth = (await mutationQueue.getPending()).some(isAuthMutation);
      const hasWork = await countPendingWorkItems();

      if (!hasAuth && hasWork === 0) break;

      if (hasAuth) {
        store.dispatch(syncTierChanged({ tier: 0, phaseLabel: SYNC_TIER_LABELS[0] }));
        const authResult = await syncAuthMutations();
        authSynced += authResult.synced;
        authFailed += authResult.failed;
        reporter.addProgress(authResult.synced, authResult.failed);

        if (authResult.blocked) {
          authBlocked = true;
          store.dispatch(syncRunFailed({ error: 'Account registration sync failed' }));
          break;
        }
      }

      if (hasWork === 0) continue;

      reporter.refreshTotalPending(await countPendingWorkItems());

      try {
        const pipeline = await runSyncPipeline(reporter);
        synced += pipeline.synced;
        failed += pipeline.failed;
        stockSynced += pipeline.stockSynced;
      } catch (error) {
        if (error instanceof AuthSyncPauseError) {
          authPaused = true;
          store.dispatch(syncRunFailed({ error: error.message }));
          break;
        }
        throw error;
      }

      if (isOfflineMode()) {
        store.dispatch(syncPaused());
        break;
      }
    }

    if (!authBlocked && !authPaused) {
      store.dispatch(syncRunCompleted());
      shouldRefreshCache = synced + failed + stockSynced + authSynced > 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    store.dispatch(syncRunFailed({ error: message }));
  } finally {
    coordinatorRunning = false;
    if (shouldRefreshCache) {
      await invalidateAfterFullSync();
    }
  }

  return {
    synced,
    failed,
    stockSynced,
    authSynced,
    authFailed,
    authBlocked,
    skipped: false,
    authPaused,
  };
}
