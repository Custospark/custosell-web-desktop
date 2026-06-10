import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SyncTierIndex } from '../offline/sync/syncConstants';
import { SYNC_TIER_LABELS } from '../offline/sync/syncConstants';

export type SyncRunStatus = 'idle' | 'running' | 'paused' | 'complete' | 'failed';

export interface SyncState {
  status: SyncRunStatus;
  currentTier: SyncTierIndex | null;
  phaseLabel: string;
  totalPending: number;
  totalSynced: number;
  totalFailed: number;
  shiftCloseWarnings: number;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  dismissed: boolean;
}

const initialState: SyncState = {
  status: 'idle',
  currentTier: null,
  phaseLabel: '',
  totalPending: 0,
  totalSynced: 0,
  totalFailed: 0,
  shiftCloseWarnings: 0,
  startedAt: null,
  completedAt: null,
  lastError: null,
  dismissed: false,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    syncRunStarted(state, action: PayloadAction<{ totalPending: number }>) {
      state.status = 'running';
      state.currentTier = 0;
      state.phaseLabel = SYNC_TIER_LABELS[0];
      state.totalPending = action.payload.totalPending;
      state.totalSynced = 0;
      state.totalFailed = 0;
      state.shiftCloseWarnings = 0;
      state.startedAt = new Date().toISOString();
      state.completedAt = null;
      state.lastError = null;
      state.dismissed = false;
    },
    syncTierChanged(state, action: PayloadAction<{ tier: SyncTierIndex; phaseLabel?: string }>) {
      state.currentTier = action.payload.tier;
      state.phaseLabel = action.payload.phaseLabel ?? SYNC_TIER_LABELS[action.payload.tier];
    },
    syncProgressUpdated(
      state,
      action: PayloadAction<{ synced?: number; failed?: number; totalPending?: number }>,
    ) {
      if (action.payload.synced) state.totalSynced += action.payload.synced;
      if (action.payload.failed) state.totalFailed += action.payload.failed;
      if (typeof action.payload.totalPending === 'number') {
        state.totalPending = action.payload.totalPending;
      }
    },
    syncShiftCloseWarning(state) {
      state.shiftCloseWarnings += 1;
    },
    syncPaused(state) {
      if (state.status === 'running') state.status = 'paused';
    },
    syncResumed(state) {
      if (state.status === 'paused') state.status = 'running';
    },
    syncRunCompleted(state) {
      state.status = 'complete';
      state.completedAt = new Date().toISOString();
      state.currentTier = null;
      state.phaseLabel = '';
    },
    syncRunFailed(state, action: PayloadAction<{ error: string }>) {
      state.status = 'failed';
      state.lastError = action.payload.error;
      state.completedAt = new Date().toISOString();
    },
    syncBannerDismissed(state) {
      state.dismissed = true;
    },
    syncReset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  syncRunStarted,
  syncTierChanged,
  syncProgressUpdated,
  syncShiftCloseWarning,
  syncPaused,
  syncResumed,
  syncRunCompleted,
  syncRunFailed,
  syncBannerDismissed,
  syncReset,
} = syncSlice.actions;

export default syncSlice.reducer;
