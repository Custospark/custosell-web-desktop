import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { useNetworkStatusMonitor } from '../../../app/store/hooks/useNetworkStatusMonitor';
import { useNetworkStatusToasts } from '../../../app/store/hooks/useNetworkStatusToasts';
import { useOfflineSync } from '../../../app/store/hooks/useOfflineSync';
import Offline from './Offline';

export default function NetworkOfflineOverlay() {
  useNetworkStatusMonitor();
  useNetworkStatusToasts();
  useOfflineSync();

  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);

  if (!isCompletelyOffline) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-auto" role="alertdialog" aria-modal="true" aria-label="You are offline">
      <Offline />
    </div>
  );
}
