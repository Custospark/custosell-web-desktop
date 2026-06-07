import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import { syncAllMutations, processStockAdjustments } from '../offline/syncEngine';
import { useToast } from '../../contexts/ToastContext';
import { queryClient } from '../../api/axiosConfig';
import { salesKeys } from '../../../modules/sales/api/salesQueries';
import { dashboardKeys } from '../../../modules/dashboard/DashboardQueries';
import { shiftKeys } from '../../../modules/shifts/ShiftQueries';
import { inventoryKeys } from '../../../modules/inventory/api/products/ProductQueries';

export function useOfflineSync(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const { showToast } = useToast();
  const wasOffline = useRef(systemStatus === 'offline');

  useEffect(() => {
    const isNowOnline = systemStatus === 'online' || systemStatus === 'slow';
    const justCameBack = wasOffline.current && isNowOnline;

    if (justCameBack) {
      (async () => {
        const { synced, failed } = await syncAllMutations();
        const stockSynced = await processStockAdjustments();

        if (synced > 0 || stockSynced > 0) {
          showToast('success', `Synced ${synced + stockSynced} pending transaction(s).`);
        }
        if (failed > 0) {
          showToast('error', `${failed} transaction(s) failed to sync.`);
        }

        await queryClient.invalidateQueries({ queryKey: salesKeys.all });
        await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
        await queryClient.invalidateQueries({ queryKey: shiftKeys.all });
        await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      })();
    }

    wasOffline.current = systemStatus === 'offline';
  }, [systemStatus, showToast]);
}
