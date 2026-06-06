import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import { syncAllMutations, processStockAdjustments } from '../offline/syncEngine';
import { useToast } from '../../contexts/ToastContext';

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

        window.location.reload();
      })();
    }

    wasOffline.current = systemStatus === 'offline';
  }, [systemStatus, showToast]);
}
