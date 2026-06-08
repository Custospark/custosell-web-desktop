import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StoredAuthSession } from '../offline/secureStorage';
import { isLocalSessionToken } from '../offline/secureStorage';

export interface BusinessInfo {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  timezone: string | null;
  business_type: string | null;
  currency: string | null;
  receipt_footer: string | null;
  logo_path: string | null;
  status: string;
}
export interface AuthUser {
  id: number;
  business_id: number | null;
  role_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  avatar?: string | null;
  business_name?: string | null;
  business?: BusinessInfo | null;
  shift_clock_in?: string | null;
  shift_id?: number | null;
  role?: { id: number; name: string; slug: string; permissions: Record<string, boolean> } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  businessId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isLocalSession: boolean;
  pendingAuthSync: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  businessId: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isLocalSession: false,
  pendingAuthSync: false,
  error: null,
};

function normalizeAuthUser(user: AuthUser): AuthUser {
  if (user.business && 'data' in user.business) {
    user.business = (user.business as { data: BusinessInfo }).data;
  }
  return user;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; token: string; isLocalSession?: boolean; pendingAuthSync?: boolean }>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      state.user = user;
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession ?? isLocalSessionToken(action.payload.token);
      state.pendingAuthSync = action.payload.pendingAuthSync ?? state.isLocalSession;
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    registerStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    registerSuccess(state, action: PayloadAction<{ user: AuthUser; token: string; isLocalSession?: boolean; pendingAuthSync?: boolean }>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      state.user = user;
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession ?? isLocalSessionToken(action.payload.token);
      state.pendingAuthSync = action.payload.pendingAuthSync ?? state.isLocalSession;
      state.error = null;
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.businessId = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.isInitialized = true;
      state.isLocalSession = false;
      state.pendingAuthSync = false;
      state.error = null;
    },
    hydrateAuth(state, action: PayloadAction<StoredAuthSession>) {
      const user = normalizeAuthUser({ ...action.payload.user });
      state.user = user;
      state.token = action.payload.token;
      state.businessId = user.business_id;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.isLocalSession = action.payload.isLocalSession;
      state.pendingAuthSync = action.payload.pendingAuthSync;
      state.isLoading = false;
      state.error = null;
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      const user = normalizeAuthUser({ ...action.payload });
      state.user = user;
      state.businessId = user.business_id;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    updateShiftContext(
      state,
      action: PayloadAction<{ shift_id: number | null; shift_clock_in: string | null }>,
    ) {
      if (!state.user) return;
      state.user.shift_id = action.payload.shift_id;
      state.user.shift_clock_in = action.payload.shift_clock_in;
    },
    setBusiness(state, action: PayloadAction<BusinessInfo>) {
      if (state.user) {
        state.user.business = action.payload;
        state.user.business_name = action.payload.name;
      }
    },
    setInitialized(state) {
      state.isInitialized = true;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const {
  loginStart, loginSuccess, loginFailure,
  registerStart, registerSuccess, registerFailure,
  logout, hydrateAuth, setUser, setBusiness, setInitialized, clearError, updateShiftContext,
} = authSlice.actions;

export default authSlice.reducer;

export function buildAuthStateFromStorage(): { token: string | null; user: AuthUser | null } {
  return { token: null, user: null };
}
