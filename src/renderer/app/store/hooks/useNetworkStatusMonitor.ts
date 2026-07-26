import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './useApp';
import {
  checkNetworkConnectivity,
  setBrowserOffline,
  setBrowserOnline,
} from '../slices/networkSlice';

const ONLINE_CHECK_INTERVAL_MS = 120_000;
const OFFLINE_CHECK_INTERVAL_MS = 15_000;

export function useNetworkStatusMonitor(): void {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleOffline = () => dispatch(setBrowserOffline());
    const handleOnline = () => {
      dispatch(setBrowserOnline());
      void dispatch(checkNetworkConnectivity());
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [dispatch]);

  useEffect(() => {
    void dispatch(checkNetworkConnectivity());

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [dispatch]);

  const systemStatus = useAppSelector((s) => s.network.systemStatus);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const ms = systemStatus === 'offline' ? OFFLINE_CHECK_INTERVAL_MS : ONLINE_CHECK_INTERVAL_MS;
    intervalRef.current = setInterval(() => {
      void dispatch(checkNetworkConnectivity());
    }, ms);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [dispatch, systemStatus]);
}
