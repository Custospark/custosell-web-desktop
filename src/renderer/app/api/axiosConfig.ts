import './axiosTypes';
import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { store } from '../store/store';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { API_BASE_URL, API_TIMEOUT } from './apiConfig';
import { clearServiceWorkerApiCache } from '../sw/registerServiceWorker';
import { clearAuthSession, isLocalSessionToken } from '../store/offline/auth/secureStorage';
import {
  ensureServerSession,
  isSessionUpgradeActive,
  needsSessionUpgrade,
} from '../store/offline/auth/sessionUpgrade';
import { LOGOUT_INTENT_KEY } from '../store/auth/runAppLogout';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { Accept: 'application/json' },
});

function normalizeBearerToken(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/^Bearer\s+/i, '').trim() || null;
}

export function resolveBearerToken(state: RootState): string | null {
  const fromRedux = normalizeBearerToken(state.auth.token);
  if (fromRedux && !isLocalSessionToken(fromRedux)) return fromRedux;

  const legacy = normalizeBearerToken(localStorage.getItem('token'));
  if (legacy && !isLocalSessionToken(legacy)) return legacy;

  return null;
}

function isAuthRequestUrl(url: string): boolean {
  return url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/businesses/register');
}

const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'auth_user';

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }
}

function markLogoutIntent(): void {
  try {
    sessionStorage.setItem(LOGOUT_INTENT_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function forceSessionLogout(): Promise<void> {
  markLogoutIntent();
  store.dispatch(logout());
  clearLegacyLocalStorage();
  queryClient.clear();
  clearServiceWorkerApiCache();
  try {
    await clearAuthSession();
  } catch {
    /* ignore */
  }
}

function shouldSkip401Logout(config: InternalAxiosRequestConfig | undefined, state: RootState): boolean {
  if (!config) return false;
  if (config.skipAuthRedirect) return true;
  if (config.localSessionRequest) return true;
  if (state.auth.isLocalSession) return true;
  if (needsSessionUpgrade()) return true;
  if (isSessionUpgradeActive()) return true;
  return false;
}

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const url = String(config.url ?? '');

    if (!config.skipSessionUpgrade && !isAuthRequestUrl(url)) {
      await ensureServerSession();
    }

    const state = store.getState();
    config.localSessionRequest = state.auth.isLocalSession;

    const token = resolveBearerToken(state);
    if (token) {
      const headers = config.headers
        ? AxiosHeaders.from(config.headers)
        : new AxiosHeaders();
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }

    if (state.auth.businessId) {
      config.headers['X-Business-Id'] = String(state.auth.businessId);
    }
    if (state.auth.user?.id) {
      config.headers['X-User-Id'] = String(state.auth.user.id);
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      (config.headers as AxiosHeaders)?.delete?.('Content-Type');
    } else {
      const method = (config.method || 'get').toLowerCase();
      const hasBody = ['post', 'put', 'patch', 'delete'].includes(method);
      if (hasBody && config.data !== undefined) {
        (config.headers as AxiosHeaders)?.set?.('Content-Type', 'application/json');
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      networkMode: 'offlineFirst',
    },
    mutations: { retry: 0, networkMode: 'always' },
  },
});

let _isHandling401 = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const state = store.getState();
    const hasAuthToken = Boolean(resolveBearerToken(state));
    const url = String(error.config?.url ?? '');
    const isAuthEndpoint = isAuthRequestUrl(url);

    const skipAuthRedirect = shouldSkip401Logout(error.config, state);

    if (
      error.response?.status === 401 &&
      state.auth.isInitialized &&
      hasAuthToken &&
      !isAuthEndpoint &&
      !skipAuthRedirect &&
      !_isHandling401
    ) {
      _isHandling401 = true;
      void forceSessionLogout().finally(() => {
        const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
        if (isElectron) {
          const base = window.location.href.split('#')[0];
          window.location.replace(`${base}#/login`);
        } else {
          window.location.href = '/login';
        }
        setTimeout(() => { _isHandling401 = false; }, 3000);
      });
    }

    return Promise.reject(error);
  },
);

export { axiosInstance };
export default axiosInstance;
