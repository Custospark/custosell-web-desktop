import { queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { syncProgressUpdated } from '../../slices/syncSlice';
import { purgeSyncedOptimisticFromCache } from './offlineCacheReconcile';
import { mutationQueue } from './mutationQueue';
import { isServerOwnedStockReason, stockLedger } from '../inventory/stockLedger';
import { isAuthMutation } from '../auth/syncAuthEngine';

/** Pending mutation queue rows + non-sale stock adjustments (matches sync coordinator). */
export async function countPendingWorkItems(): Promise<number> {
  const pending = await mutationQueue.getPending();
  const nonAuth = pending.filter((m) => !isAuthMutation(m));
  const adjustments = await stockLedger.getPendingAdjustments();
  const stockCount = adjustments.filter((adj) => !isServerOwnedStockReason(adj.reason)).length;
  return nonAuth.length + stockCount;
}

/**
 * Call immediately after a queue item is committed and its local IDB row is removed.
 * Strips stale Pending sync badges from React Query and updates the sync pending counter.
 */
export async function notifyItemCommitted(): Promise<void> {
  await purgeSyncedOptimisticFromCache(queryClient);

  const syncStatus = store.getState().sync.status;
  if (syncStatus !== 'running' && syncStatus !== 'paused') return;

  const totalPending = await countPendingWorkItems();
  store.dispatch(syncProgressUpdated({ totalPending }));
}
