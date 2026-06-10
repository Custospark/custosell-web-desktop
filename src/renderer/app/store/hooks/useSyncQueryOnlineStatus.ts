import { useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';
import { upgradeLocalSessionIfOnline } from '../offline/sessionUpgrade';

/**
 * Keeps React Query's online manager aligned with Redux systemStatus.
 * When a device local session needs upgrade, completes silent auth before
 * marking queries reachable so refetchOnReconnect cannot race ahead of login.
 */
export function useSyncQueryOnlineStatus(): void {
  const systemStatus = useAppSelector(selectSystemStatus);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const isLocalSession = useAppSelector((state) => state.auth.isLocalSession);
  const pendingAuthSync = useAppSelector((state) => state.auth.pendingAuthSync);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const isReachable = systemStatus === 'online' || systemStatus === 'slow';

      if (!isReachable) {
        onlineManager.setOnline(false);
        return;
      }

      if (isInitialized && isLocalSession && !pendingAuthSync) {
        await upgradeLocalSessionIfOnline();
        if (cancelled) return;
      }

      onlineManager.setOnline(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [systemStatus, isInitialized, isLocalSession, pendingAuthSync]);
}
