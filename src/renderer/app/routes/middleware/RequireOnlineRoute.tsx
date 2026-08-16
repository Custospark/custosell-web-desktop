import { Outlet, useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { matchOnlineOnlyPath } from '../../../shared/components/layout/onlineOnlyNav';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../store/hooks/useApp';
import { checkNetworkConnectivity } from '../../store/slices/networkSlice';
import { useState, useCallback } from 'react';

/**
 * Blocks a route when the device is completely offline. When offline the whole
 * page is replaced with a reconnect screen instead of rendering the underlying
 * (online-only) content. On reconnect the page loads normally.
 */
export function RequireOnlineRoute() {
  const { isCompletelyOffline } = useNetworkStatus();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const entry = matchOnlineOnlyPath(location.pathname);
  const [retryStatus, setRetryStatus] = useState<'idle' | 'checking'>('idle');

  const handleRetry = useCallback(async () => {
    setRetryStatus('checking');
    try {
      await dispatch(checkNetworkConnectivity()).unwrap();
      setRetryStatus('idle');
    } catch {
      setTimeout(() => setRetryStatus('idle'), 2000);
    }
  }, [dispatch]);

  if (!isCompletelyOffline || !entry) return <Outlet />;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <WifiOff className="h-8 w-8 text-amber-600" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{entry.label} requires connection</h1>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">{entry.message}</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retryStatus === 'checking'}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${retryStatus === 'checking' ? 'animate-spin' : ''}`} />
          {retryStatus === 'checking' ? 'Checking…' : 'Reconnect'}
        </button>
      </div>
    </div>
  );
}
