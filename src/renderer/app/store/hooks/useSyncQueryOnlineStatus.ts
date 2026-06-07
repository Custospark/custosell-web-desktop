import { useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useAppSelector } from './useApp';
import { selectSystemStatus } from '../slices/networkSlice';

/**
 * Keeps React Query's online manager aligned with Redux systemStatus.
 * Completely offline → paused. Online or slow → reachable (slow is not offline).
 * Query refresh after reconnect is handled in useOfflineSync after queue drain.
 */
export function useSyncQueryOnlineStatus(): void {
  const systemStatus = useAppSelector(selectSystemStatus);

  useEffect(() => {
    const isReachable = systemStatus === 'online' || systemStatus === 'slow';
    onlineManager.setOnline(isReachable);
  }, [systemStatus]);
}
