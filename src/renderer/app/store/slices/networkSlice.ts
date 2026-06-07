import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { probeNetworkConnectivity } from '../network/connectivityCheck';
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
  offlineBannerDismissed: false,
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
      state.offlineBannerDismissed = false;
    },
    dismissOfflineBanner(state) {
      state.offlineBannerDismissed = true;
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
        if (action.payload.systemStatus === 'offline') {
          state.offlineBannerDismissed = false;
        }
      })
      .addCase(checkNetworkConnectivity.rejected, (state) => {
        state.isChecking = false;
        state.systemStatus = 'offline';
        state.isOnline = false;
        state.latency = null;
        state.lastCheckedAt = new Date().toISOString();
        state.offlineBannerDismissed = false;
      });
  },
});

export const { setBrowserOffline, dismissOfflineBanner } = networkSlice.actions;

export const selectSystemStatus = (state: RootState): SystemStatus => state.network.systemStatus;
export const selectIsOnline = (state: RootState): boolean => state.network.isOnline;
export const selectNetworkLatency = (state: RootState): number | null => state.network.latency;
export const selectIsCompletelyOffline = (state: RootState): boolean => state.network.systemStatus === 'offline';
export const selectShowOfflineBanner = (state: RootState): boolean =>
  state.network.systemStatus === 'offline' && !state.network.offlineBannerDismissed;
export const selectNetworkIsChecking = (state: RootState): boolean => state.network.isChecking;

export default networkSlice.reducer;
