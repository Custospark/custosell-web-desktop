import { useNetworkStatusMonitor } from '../../../app/store/hooks/useNetworkStatusMonitor';
import { useNetworkStatusToasts } from '../../../app/store/hooks/useNetworkStatusToasts';
import { useOfflineSync } from '../../../app/store/hooks/useOfflineSync';
import { useSeedStockLedger } from '../../../app/store/hooks/useSeedStockLedger';
import { useSyncQueryOnlineStatus } from '../../../app/store/hooks/useSyncQueryOnlineStatus';

/** Headless global effects for offline detection, sync, and stock seeding. */
export default function NetworkOfflineOverlay() {
  useNetworkStatusMonitor();
  useNetworkStatusToasts();
  useOfflineSync();
  useSeedStockLedger();
  useSyncQueryOnlineStatus();

  return null;
}
