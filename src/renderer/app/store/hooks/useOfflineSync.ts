import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import {
  hasPendingSyncWork,
  syncPendingDataIfOnline,
} from '../offline/syncPendingIfOnline';
import { purgeSyncedOptimisticFromCache } from '../offline/offlineCacheReconcile';
import { upgradeLocalSessionIfOnline } from '../offline/sessionUpgrade';
import { queryClient } from '../../api/axiosConfig';
import { useToast } from '../../contexts/ToastContext';

/**
 * Sync queued IndexedDB work when connectivity returns.
 * Silently upgrades device local sessions to server sessions before draining the queue.
 */
export function useOfflineSync(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const token = useAppSelector((state) => state.auth.token);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);
  const pendingAuthSync = useAppSelector((state) => state.auth.pendingAuthSync);
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

      const needsSessionUpgrade = isLocalSession && !pendingAuthSync;

      if (isBootstrap && !reconnected) {
        const pending = await hasPendingSyncWork();
        if (!pending && !needsSessionUpgrade) {
          await purgeSyncedOptimisticFromCache(queryClient);
          return;
        }
      }

      if (needsSessionUpgrade) {
        await upgradeLocalSessionIfOnline();
        if (cancelled) return;
      }

      const result = await syncPendingDataIfOnline();
      if (cancelled) return;

      const showRegistrationAuthToast = pendingAuthSync;
      if (showRegistrationAuthToast && result.authSynced > 0) {
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
  }, [systemStatus, showToast, isInitialized, token, isLocalSession, pendingAuthSync]);
}
