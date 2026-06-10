import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { probeNetworkConnectivity } from '../network/connectivityCheck';
import {
  isOfflineBannerDismissed,
  persistOfflineBannerDismissed,
} from '../offline/core/offlinePreferences';
import type { RootState } from '../store';

export type SystemStatus = 'online' | 'slow' | 'offline';

export interface NetworkState {
  systemStatus: SystemStatus;
  isOnline: boolean;
  latency: number | null;
  lastCheckedAt: string | null;
  isChecking: boolean;
  offlineBannerDismissed: boolean;
}

const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

const initialState: NetworkState = {
  systemStatus: browserOnline ? 'online' : 'offline',
  isOnline: browserOnline,
  latency: null,
  lastCheckedAt: null,
  isChecking: false,
  offlineBannerDismissed: isOfflineBannerDismissed(),
};

export const checkNetworkConnectivity = createAsyncThunk(
  'network/checkConnectivity',
  async () => {
    console.log('[NetSlice] checkNetworkConnectivity - starting probe');
    const result = await probeNetworkConnectivity();
    console.log('[NetSlice] probe result:', result.systemStatus, result.isOnline, result.latency);
    return result;
  },
);

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setBrowserOffline(state) {
      state.systemStatus = 'offline';
      state.isOnline = false;
      state.latency = null;
      state.lastCheckedAt = new Date().toISOString();
    },
    /** Browser reported online — optimistic until probe confirms. Triggers immediate sync. */
    setBrowserOnline(state) {
      state.systemStatus = 'online';
      state.isOnline = true;
      state.lastCheckedAt = new Date().toISOString();
    },
    dismissOfflineBanner(state) {
      state.offlineBannerDismissed = true;
      persistOfflineBannerDismissed();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkNetworkConnectivity.pending, (state) => {
        state.isChecking = true;
      })
      .addCase(checkNetworkConnectivity.fulfilled, (state, action) => {
        state.isChecking = false;
        state.systemStatus = action.payload.systemStatus;
        state.isOnline = action.payload.isOnline;
        state.latency = action.payload.latency;
        state.lastCheckedAt = new Date().toISOString();
      })
      .addCase(checkNetworkConnectivity.rejected, (state) => {
        state.isChecking = false;
        state.systemStatus = 'offline';
        state.isOnline = false;
        state.latency = null;
        state.lastCheckedAt = new Date().toISOString();
      });
  },
});

export const { setBrowserOffline, setBrowserOnline, dismissOfflineBanner } = networkSlice.actions;

export const selectSystemStatus = (state: RootState): SystemStatus => state.network.systemStatus;
export const selectIsOnline = (state: RootState): boolean => state.network.isOnline;
export const selectNetworkLatency = (state: RootState): number | null => state.network.latency;
export const selectIsCompletelyOffline = (state: RootState): boolean => state.network.systemStatus === 'offline';
export const selectShowOfflineBanner = (state: RootState): boolean =>
  state.network.systemStatus === 'offline' && !state.network.offlineBannerDismissed;
export const selectNetworkIsChecking = (state: RootState): boolean => state.network.isChecking;

export default networkSlice.reducer;
