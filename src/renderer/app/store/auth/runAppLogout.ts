import type { NavigateFunction } from 'react-router-dom';
import { store } from '../store';
import { logout } from '../slices/authSlice';
import { queryClient } from '../../api/axiosConfig';
import { clearServiceWorkerApiCache } from '../../sw/registerServiceWorker';
import { clearAuthSession, isLocalSessionToken } from '../offline/auth/secureStorage';
import { ROUTES } from '../../routes/constants/shared.paths';
import { isCompletelyOffline } from '../offline/core/offlineQueryUtils';
import { axiosInstance } from '../../api/axiosConfig';
export const LOGOUT_INTENT_KEY = 'custosell_logout_intent';

const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'auth_user';
const SESSION_CLEAR_TIMEOUT_MS = 2000;

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeLogoutIntent(): boolean {
  try {
    const pending = sessionStorage.getItem(LOGOUT_INTENT_KEY) === '1';
    if (pending) sessionStorage.removeItem(LOGOUT_INTENT_KEY);
    return pending;
  } catch {
    return false;
  }
}

function isElectronApp(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
}

function redirectToPath(path: string, navigate?: NavigateFunction): void {
  if (navigate) {
    navigate(path, { replace: true });
  }

  const isElectron = isElectronApp();

  if (isElectron) {
    const base = window.location.href.split('#')[0];
    const target = `${base}#${path}`;
    if (!window.location.hash.includes(path)) {
      window.location.replace(target);
    }
    return;
  }

  if (window.location.pathname !== path) {
    window.location.replace(path);
  }
}

function scheduleBackgroundCleanup(): void {
  window.setTimeout(() => {
    try {
      queryClient.clear();
    } catch {
      /* ignore */
    }
    try {
      clearServiceWorkerApiCache();
    } catch {
      /* ignore */
    }
  }, 0);
}

function scheduleServerLogoutRevoke(token: string | null, isLocalSession: boolean): void {
  if (isCompletelyOffline() || isLocalSession || isLocalSessionToken(token)) {
    return;
  }

  void axiosInstance
    .post('/auth/logout', undefined, { skipAuthRedirect: true, timeout: 5000 } as never)
    .catch(() => undefined);
}

async function clearAuthSessionWithTimeout(): Promise<void> {
  await Promise.race([
    clearAuthSession(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, SESSION_CLEAR_TIMEOUT_MS);
    }),
  ]).catch((err) => {
    console.warn('[Auth] Session clear failed:', err);
  });
}

/**
 * Logout — clears persisted session first, then navigates to login.
 * Works offline; never waits on the network.
 */
export async function runAppLogout(options?: { navigate?: NavigateFunction; redirectTo?: string }): Promise<void> {
  const { token, isLocalSession } = store.getState().auth;

  // Session is cleared before navigate — no logout intent (that flag is for 401 hard-redirect races only).
  store.dispatch(logout());
  clearLegacyLocalStorage();

  await clearAuthSessionWithTimeout();

  scheduleBackgroundCleanup();
  scheduleServerLogoutRevoke(token, isLocalSession);
  redirectToPath(options?.redirectTo ?? ROUTES.LOGIN, options?.navigate);
}
