import type { NavigateFunction } from 'react-router-dom';
import type { AppDispatch } from '../store';
import { logout } from '../slices/authSlice';
import { clearAuthSession } from '../offline/secureStorage';
import { queryClient } from '../../api/axiosConfig';
import { clearServiceWorkerApiCache } from '../../sw/registerServiceWorker';
import { ROUTES } from '../../routes/constants/shared.paths';

/** Clear auth state and caches. Keeps device credentials for offline re-login. */
export async function clearAppSession(dispatch: AppDispatch): Promise<void> {
  dispatch(logout());
  await clearAuthSession();
  queryClient.clear();
  clearServiceWorkerApiCache();
}

/** Local logout + redirect to login (works online and offline). */
export async function performAppLogout(
  dispatch: AppDispatch,
  navigate: NavigateFunction,
): Promise<void> {
  try {
    await clearAppSession(dispatch);
  } finally {
    navigate(ROUTES.LOGIN, { replace: true });
  }
}
