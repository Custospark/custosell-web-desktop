import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import {
  hasPendingSyncWork,
  syncPendingDataIfOnline,
} from '../offline/syncPendingIfOnline';
import { purgeSyncedOptimisticFromCache } from '../offline/offlineCacheReconcile';
import { queryClient } from '../../api/axiosConfig';
import { useToast } from '../../contexts/ToastContext';

/**
 * Sync queued IndexedDB work when connectivity returns.
 * Does NOT re-run on every online/slow flicker — only reconnect or startup with pending work.
 */
export function useOfflineSync(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const token = useAppSelector((state) => state.auth.token);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);
  const { showToast } = useToast();
  const previousStatus = useRef(systemStatus);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;

    const wasCompletelyOffline = previousStatus.current === 'offline';
    const isCompletelyOffline = systemStatus === 'offline';
    previousStatus.current = systemStatus;

    if (isCompletelyOffline) return;
    if (!token && !isLocalSession) return;

    let cancelled = false;

    void (async () => {
      const reconnected = wasCompletelyOffline;
      const isBootstrap = !hasBootstrapped.current;
      hasBootstrapped.current = true;

      if (!reconnected && !isBootstrap) return;

      if (isBootstrap && !reconnected) {
        const pending = await hasPendingSyncWork();
        if (!pending) {
          // Prior session may have synced to the server before cache cleanup ran.
          await purgeSyncedOptimisticFromCache(queryClient);
          return;
        }
      }

      const result = await syncPendingDataIfOnline();
      if (cancelled) return;

      if (result.authSynced > 0) {
        showToast('success', 'Account synced successfully.');
      }
      if (result.authFailed > 0 || result.authBlocked) {
        showToast('error', 'Account sync failed. Check your connection or use a different email.');
      }
      if (result.authPaused) {
        showToast('error', 'Sync paused — please sign in again.');
      }

      if (!result.skipped && result.failed > 0) {
        showToast('error', `${result.failed} item${result.failed === 1 ? '' : 's'} failed to sync.`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [systemStatus, showToast, isInitialized, token, isLocalSession]);
}
