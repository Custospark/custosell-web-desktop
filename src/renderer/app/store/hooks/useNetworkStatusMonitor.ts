import { useEffect } from 'react';
import { useAppDispatch } from './useApp';
import { checkNetworkConnectivity, setBrowserOffline } from '../slices/networkSlice';

const CHECK_INTERVAL_MS = 30_000;

export function useNetworkStatusMonitor(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleOffline = () => dispatch(setBrowserOffline());
    const handleOnline = () => { void dispatch(checkNetworkConnectivity()); };

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

    const intervalId = window.setInterval(() => {
      void dispatch(checkNetworkConnectivity());
    }, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(intervalId);
    };
  }, [dispatch]);
}
