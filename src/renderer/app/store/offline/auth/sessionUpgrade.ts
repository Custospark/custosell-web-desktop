import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../api/axiosConfig';
import { API_TIMEOUT } from '../../../api/apiConfig';
import { store } from '../../store';
import type { AuthUser } from '../../slices/authSlice';
import type { Plan } from '../../../../shared/types';
import type { AuthResponse, LoginRequest } from '../../../../shared/api/account/AccountTypes';
import { isOfflineMode } from '../core/offlineQueryUtils';
import { isLocalSessionToken } from './secureStorage';
import { mutationQueue } from '../sync/mutationQueue';
import { isAuthLoginMutation, isAuthMutation, syncAuthMutations } from './syncAuthEngine';
import { applyServerAuth } from './authSessionApply';
import { loadDeviceLoginPassword } from './deviceLoginSecrets';

export interface SessionUpgradeResult {
  upgraded: boolean;
  reason?:
    | 'offline'
    | 'not_applicable'
    | 'already_server'
    | 'no_email'
    | 'auth_sync_failed'
    | 'no_password'
    | 'login_failed';
}

function extractAuthUser(data: AuthResponse): AuthUser {
  const userData = data.user?.data ?? data.user;
  if (userData.business && typeof userData.business === 'object' && 'data' in userData.business) {
    userData.business = (userData.business as { data: AuthUser['business'] }).data;
  }
  return userData;
}

function extractActivePlans(userData: Record<string, unknown> | null | undefined): Plan[] {
  const plans = (userData as { active_plans?: unknown })?.active_plans;
  if (Array.isArray(plans)) return plans;
  if (plans && typeof plans === 'object' && 'data' in (plans as object) && Array.isArray((plans as { data: unknown }).data)) {
    return (plans as { data: Plan[] }).data;
  }
  return [];
}

export function needsSessionUpgrade(): boolean {
  const { auth } = store.getState();
  if (!auth.isInitialized || !auth.isLocalSession || auth.pendingAuthSync) return false;
  if (!auth.user?.email) return false;
  if (auth.token && !isLocalSessionToken(auth.token)) return false;
  return true;
}

export function isSessionUpgradeActive(): boolean {
  return activeUpgrade !== null;
}

async function runSessionUpgrade(): Promise<SessionUpgradeResult> {
  if (isOfflineMode()) return { upgraded: false, reason: 'offline' };
  if (!needsSessionUpgrade()) {
    const { auth } = store.getState();
    if (auth.token && !isLocalSessionToken(auth.token)) {
      return { upgraded: false, reason: 'already_server' };
    }
    if (!auth.user?.email) return { upgraded: false, reason: 'no_email' };
    return { upgraded: false, reason: 'not_applicable' };
  }

  const email = store.getState().auth.user!.email;

  const pending = await mutationQueue.getPending();
  const hasAuthWork = pending.some(isAuthMutation);
  if (hasAuthWork) {
    const authResult = await syncAuthMutations();
    if (authResult.synced > 0 && !store.getState().auth.isLocalSession) {
      return { upgraded: true };
    }
    if (authResult.failed > 0 || authResult.blocked) {
      return { upgraded: false, reason: 'auth_sync_failed' };
    }
  }

  if (!needsSessionUpgrade()) {
    return { upgraded: false, reason: 'already_server' };
  }

  const stillPending = await mutationQueue.getPending();
  if (stillPending.some(isAuthLoginMutation)) {
    return { upgraded: false, reason: 'auth_sync_failed' };
  }

  const password = await loadDeviceLoginPassword(email);
  if (!password) return { upgraded: false, reason: 'no_password' };

  try {
    const { data } = await axiosInstance.post<AuthResponse>(
      '/auth/login',
      { email, password } satisfies LoginRequest,
      {
        skipAuthRedirect: true,
        skipSessionUpgrade: true,
        timeout: Math.min(API_TIMEOUT, 5000),
      } as never,
    );
    const user = extractAuthUser(data);
    await applyServerAuth(user, data.token, password, extractActivePlans(user));
    return { upgraded: true };
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    console.warn('[Session] Silent login upgrade failed:', status ?? err);
    return { upgraded: false, reason: 'login_failed' };
  }
}

let activeUpgrade: Promise<SessionUpgradeResult> | null = null;

/** Block API traffic until a device local session is promoted to a server session. */
export async function ensureServerSession(): Promise<void> {
  if (isOfflineMode()) return;
  if (!needsSessionUpgrade()) return;
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('Session upgrade timed out')), 5000),
  );
  await Promise.race([upgradeLocalSessionIfOnline(), timeout]);
  // swallow — if upgrade fails, let the request proceed without it
}

/** Silently exchange a device local session for a server session when online. */
export async function upgradeLocalSessionIfOnline(): Promise<SessionUpgradeResult> {
  activeUpgrade ??= runSessionUpgrade().finally(() => {
    activeUpgrade = null;
  });
  return activeUpgrade;
}
