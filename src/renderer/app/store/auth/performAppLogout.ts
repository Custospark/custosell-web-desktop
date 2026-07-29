import type { NavigateFunction } from 'react-router-dom';
import type { AppDispatch } from '../store';
import { logout } from '../slices/authSlice';
import { clearAuthSession } from '../offline/auth/secureStorage';
import { queryClient } from '../../api/axiosConfig';
import { clearServiceWorkerApiCache } from '../../sw/registerServiceWorker';
import { ROUTES } from '../../routes/constants/shared.paths';
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'auth_user';
const SESSION_CLEAR_TIMEOUT_MS = 3000;

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    /* ignore */
  }
}

async function clearAuthSessionWithTimeout(): Promise<void> {
  await Promise.race([
    clearAuthSession(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, SESSION_CLEAR_TIMEOUT_MS);
    }),
  ]).catch((err) => {
    console.warn('[Auth] Session clear timed out or failed:', err);
  });
}

function redirectToLogin(navigate: NavigateFunction): void {
  navigate(ROUTES.LOGIN, { replace: true });
  const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  if (isElectron && !window.location.hash.includes('/login')) {
    window.location.hash = `#${ROUTES.LOGIN}`;
  }
}

/** Clear auth state and caches. Offline business data stays in IndexedDB. */
export async function clearAppSession(dispatch: AppDispatch): Promise<void> {
  dispatch(logout());
  clearLegacyLocalStorage();
  await clearAuthSessionWithTimeout();
  queryClient.clear();
  clearServiceWorkerApiCache();
}

/** Local logout + redirect to login. Never waits on network. */
export async function performAppLogout(
  dispatch: AppDispatch,
  navigate: NavigateFunction,
): Promise<void> {
  dispatch(logout());
  clearLegacyLocalStorage();
  queryClient.clear();
  clearServiceWorkerApiCache();
  redirectToLogin(navigate);
  void clearAuthSessionWithTimeout();
}
