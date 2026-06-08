import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import { syncPendingDataIfOnline } from '../offline/syncPendingIfOnline';
import { purgeSyncedOptimisticFromCache } from '../offline/offlineCacheReconcile';
import { useToast } from '../../contexts/ToastContext';
import { queryClient } from '../../api/axiosConfig';
import { salesKeys } from '../../../modules/sales/api/salesQueries';
import { dashboardKeys } from '../../../modules/dashboard/DashboardQueries';
import { shiftKeys } from '../../../modules/shifts/ShiftQueries';
import { inventoryKeys } from '../../../modules/inventory/api/products/ProductQueries';
import { expenseKeys } from '../../../modules/expenses/api/ExpenseQueries';

async function refreshAfterSync(): Promise<void> {
  await purgeSyncedOptimisticFromCache(queryClient);
  await queryClient.invalidateQueries({ queryKey: salesKeys.all });
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  await queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['customers'] });
  await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['roles'] });
  await queryClient.invalidateQueries({ queryKey: ['staff'] });
  await queryClient.invalidateQueries({ queryKey: ['business'] });
}

/**
 * Sync queued IndexedDB work the moment we are no longer completely offline.
 * Purges synced rows from cache so pending badges never linger after sync.
 */
export function useOfflineSync(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const { showToast } = useToast();
  const previousStatus = useRef(systemStatus);

  useEffect(() => {
    const wasCompletelyOffline = previousStatus.current === 'offline';
    const isCompletelyOffline = systemStatus === 'offline';
    previousStatus.current = systemStatus;

    if (isCompletelyOffline) return;

    let cancelled = false;

    void (async () => {
      const result = await syncPendingDataIfOnline();
      if (cancelled) return;

      const totalSynced = result.synced + result.stockSynced + result.authSynced;

      if (result.authSynced > 0) {
        showToast('success', 'Account synced successfully.');
      }
      if (result.authFailed > 0) {
        showToast('error', 'Account sync failed. Check your connection or use a different email.');
      }
      if (totalSynced > result.authSynced) {
        showToast('success', `Synced ${totalSynced - result.authSynced} pending transaction(s).`);
      }
      if (result.failed > 0) {
        showToast('error', `${result.failed} transaction(s) failed to sync.`);
      }

      if (
        !result.skipped
        || wasCompletelyOffline
        || totalSynced > 0
        || result.failed > 0
        || result.authFailed > 0
      ) {
        await refreshAfterSync();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [systemStatus, showToast]);
}
