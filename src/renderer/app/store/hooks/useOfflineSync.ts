import { useEffect, useRef } from 'react';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import { syncPendingDataIfOnline } from '../offline/syncPendingIfOnline';
import {
  invalidateAfterFullSync,
  invalidateAfterTransactionsTier,
} from '../offline/syncCacheRefresh';
import { useToast } from '../../contexts/ToastContext';

/**
 * Sync queued IndexedDB work when connectivity returns.
 * Runs in the background — the user can keep working while sync proceeds.
 */
export function useOfflineSync(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const token = useAppSelector((state) => state.auth.token);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);
  const { showToast } = useToast();
  const previousStatus = useRef(systemStatus);

  useEffect(() => {
    if (!isInitialized) return;

    const wasCompletelyOffline = previousStatus.current === 'offline';
    const isCompletelyOffline = systemStatus === 'offline';
    previousStatus.current = systemStatus;

    if (isCompletelyOffline) return;

    // Avoid firing sync before auth is ready or when there is no session to sync.
    if (!token && !isLocalSession) return;

    let cancelled = false;

    void (async () => {
      const result = await syncPendingDataIfOnline();
      if (cancelled) return;

      const totalSynced = result.synced + result.stockSynced + result.authSynced;

      if (result.authSynced > 0) {
        showToast('success', 'Account synced successfully.');
      }
      if (result.authFailed > 0 || result.authBlocked) {
        showToast('error', 'Account sync failed. Check your connection or use a different email.');
      }
      if (result.authPaused) {
        showToast('error', 'Sync paused — please sign in again.');
      }

      if (!result.skipped && totalSynced > result.authSynced) {
        await invalidateAfterTransactionsTier();
      }

      if (
        !result.skipped
        && (wasCompletelyOffline || totalSynced > 0 || result.failed > 0)
      ) {
        await invalidateAfterFullSync();
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
