import './axiosTypes';
import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { store } from '../store/store';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { API_BASE_URL, API_TIMEOUT } from './apiConfig';
import { clearServiceWorkerApiCache } from '../sw/registerServiceWorker';

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

function resolveBearerToken(state: RootState): string | null {
  const fromRedux = normalizeBearerToken(state.auth.token);
  if (fromRedux) return fromRedux;
  return normalizeBearerToken(localStorage.getItem('token'));
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = store.getState();
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
    },
    mutations: { retry: 1 },
  },
});

let _isHandling401 = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const state = store.getState();
    const hasAuthToken = Boolean(state.auth.token || localStorage.getItem('token'));
    const url = String(error.config?.url ?? '');
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');

    const skipAuthRedirect = Boolean(error.config?.skipAuthRedirect);

    if (
      error.response?.status === 401 &&
      hasAuthToken &&
      !isAuthEndpoint &&
      !skipAuthRedirect &&
      !_isHandling401
    ) {
      _isHandling401 = true;
      store.dispatch(logout());
      queryClient.clear();
      clearServiceWorkerApiCache();
      window.location.href = '/login';
      setTimeout(() => { _isHandling401 = false; }, 3000);
    }

    return Promise.reject(error);
  },
);

export { axiosInstance };
export default axiosInstance;
