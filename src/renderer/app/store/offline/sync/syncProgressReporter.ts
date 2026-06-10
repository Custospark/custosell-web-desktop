import { store } from '../../store';
import {
  syncProgressUpdated,
  syncShiftCloseWarning,
  syncTierChanged,
} from '../../slices/syncSlice';
import type { SyncTierIndex } from './syncConstants';

export interface SyncProgressReporter {
  setTier(tier: SyncTierIndex, phaseLabel?: string): void;
  addProgress(synced: number, failed: number): void;
  refreshTotalPending(totalPending: number): void;
  recordShiftCloseWarning(): void;
}

export function createSyncProgressReporter(): SyncProgressReporter {
  return {
    setTier(tier, phaseLabel) {
      store.dispatch(syncTierChanged({ tier, phaseLabel }));
    },
    addProgress(synced, failed) {
      store.dispatch(syncProgressUpdated({ synced, failed }));
    },
    refreshTotalPending(totalPending) {
      store.dispatch(syncProgressUpdated({ totalPending }));
    },
    recordShiftCloseWarning() {
      store.dispatch(syncShiftCloseWarning());
    },
  };
}
