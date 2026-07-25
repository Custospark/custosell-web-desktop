import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useApp';
import {
  checkNetworkConnectivity,
  setBrowserOffline,
  setBrowserOnline,
  selectSystemStatus,
} from '../slices/networkSlice';

const ONLINE_CHECK_INTERVAL_MS = 120_000;
const OFFLINE_CHECK_INTERVAL_MS = 15_000;

export function useNetworkStatusMonitor(): void {
  const dispatch = useAppDispatch();
  const systemStatus = useAppSelector(selectSystemStatus);

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
    const initialId = window.setTimeout(() => {
      void dispatch(checkNetworkConnectivity());
    }, 0);

    const intervalMs =
      systemStatus === 'offline' ? OFFLINE_CHECK_INTERVAL_MS : ONLINE_CHECK_INTERVAL_MS;

    const intervalId = window.setInterval(() => {
      void dispatch(checkNetworkConnectivity());
    }, intervalMs);

    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(intervalId);
    };
  }, [dispatch, systemStatus]);
}
