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

    console.log('[OfflineSync] systemStatus:', systemStatus, 'wasOffline:', wasOffline.current, 'isNowOnline:', isNowOnline, 'justCameBack:', justCameBack);

    if (justCameBack) {
      console.log('[OfflineSync] ONLINE DETECTED — starting sync');
      (async () => {
        console.log('[OfflineSync] Calling syncAllMutations...');
        const { synced, failed } = await syncAllMutations();
        console.log('[OfflineSync] syncAllMutations result:', { synced, failed });

        console.log('[OfflineSync] Calling processStockAdjustments...');
        const stockSynced = await processStockAdjustments();
        console.log('[OfflineSync] processStockAdjustments result:', stockSynced);

        if (synced > 0 || stockSynced > 0) {
          showToast('success', `Synced ${synced + stockSynced} pending transaction(s).`);
        }
        if (failed > 0) {
          showToast('error', `${failed} transaction(s) failed to sync.`);
        }

        console.log('[OfflineSync] Reloading page...');
        window.location.reload();
      })();
    }

    wasOffline.current = systemStatus === 'offline';
  }, [systemStatus, showToast]);
}
