import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useApp';
import {
  selectSystemStatus,
  selectIsOnline,
  selectNetworkLatency,
  selectNetworkLastCheckedAt,
  selectIsCompletelyOffline,
  selectNetworkIsChecking,
  checkNetworkConnectivity,
} from '../slices/networkSlice';

export function useNetworkStatus() {
  const dispatch = useAppDispatch();
  const systemStatus = useAppSelector(selectSystemStatus);
  const isOnline = useAppSelector(selectIsOnline);
  const latency = useAppSelector(selectNetworkLatency);
  const lastCheckedAt = useAppSelector(selectNetworkLastCheckedAt);
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);
  const isChecking = useAppSelector(selectNetworkIsChecking);

  const retryConnection = useCallback(() => {
    void dispatch(checkNetworkConnectivity());
  }, [dispatch]);

  return { systemStatus, isOnline, latency, lastCheckedAt, isCompletelyOffline, isChecking, retryConnection };
}
