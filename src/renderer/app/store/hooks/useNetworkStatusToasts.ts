import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './useApp';
import { selectSystemStatus, checkNetworkConnectivity } from '../slices/networkSlice';
import { buildOfflineToastMessage, buildOnlineToastMessage } from '../network/networkStatusToasts';
import { useToast } from '../../contexts/ToastContext';

export function useNetworkStatusToasts(): void {
  const dispatch = useAppDispatch();
  const systemStatus = useAppSelector(selectSystemStatus);
  const user = useAppSelector((s) => s.auth.user);
  const { showToast } = useToast();
  const prevRef = useRef(systemStatus);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = systemStatus;
      return;
    }

    const prev = prevRef.current;
    prevRef.current = systemStatus;

    const wentOffline = prev !== 'offline' && systemStatus === 'offline';
    const cameBackOnline = prev === 'offline' && systemStatus !== 'offline';

    if (wentOffline) {
      showToast('info', buildOfflineToastMessage(user?.name ?? null));
    }

    if (cameBackOnline) {
      void dispatch(checkNetworkConnectivity());
      showToast('success', buildOnlineToastMessage(user?.name ?? null));
    }
  }, [systemStatus, user, showToast, dispatch]);
}
