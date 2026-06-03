import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: number;
  business_id: number | null;
  role_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role?: { id: number; name: string; slug: string; permissions: Record<string, boolean> } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  businessId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const STORAGE_KEY_TOKEN = 'token';
const STORAGE_KEY_USER = 'auth_user';

function loadFromStorage(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    const user = raw ? JSON.parse(raw) as AuthUser : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function saveToStorage(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch { /* storage full or unavailable */ }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch { /* ignore */ }
}

const { token, user } = loadFromStorage();

const initialState: AuthState = {
  user,
  token,
  businessId: user?.business_id ?? null,
  isAuthenticated: !!token,
  isLoading: false,
  isInitialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.businessId = action.payload.user.business_id;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.error = null;
      saveToStorage(action.payload.token, action.payload.user);
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    registerStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    registerSuccess(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.businessId = action.payload.user.business_id;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isInitialized = true;
      state.error = null;
      saveToStorage(action.payload.token, action.payload.user);
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
      state.error = null;
      clearStorage();
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.businessId = action.payload.business_id;
      state.isAuthenticated = true;
      state.isInitialized = true;
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
  logout, setUser, setInitialized, clearError,
} = authSlice.actions;

export default authSlice.reducer;

export function buildAuthStateFromStorage() {
  return loadFromStorage();
}
