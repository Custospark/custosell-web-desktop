import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { useNetworkStatusMonitor } from '../../../app/store/hooks/useNetworkStatusMonitor';
import { useNetworkStatusToasts } from '../../../app/store/hooks/useNetworkStatusToasts';
import { useOfflineSync } from '../../../app/store/hooks/useOfflineSync';
import { useSeedStockLedger } from '../../../app/store/hooks/useSeedStockLedger';
import { WifiOff } from 'lucide-react';

export default function NetworkOfflineOverlay() {
  useNetworkStatusMonitor();
  useNetworkStatusToasts();
  useOfflineSync();
  useSeedStockLedger();

  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);
  const userName = useAppSelector((s) => s.auth.user?.name);

  if (!isCompletelyOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700">
      <WifiOff className="w-4 h-4 shrink-0 text-red-500" />
      <span className="font-medium">
        {userName ? `${userName}, you're offline` : "You're offline"}
      </span>
      <span className="text-red-500">·</span>
      <span className="text-red-500">Sales will be saved locally and synced when reconnected.</span>
    </div>
  );
}
