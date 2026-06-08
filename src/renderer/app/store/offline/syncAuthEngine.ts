import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axiosConfig';
import { store } from '../store';
import { loginSuccess } from '../slices/authSlice';
import type { AuthUser } from '../slices/authSlice';
import type { AuthResponse, BusinessRegisterRequest, LoginRequest } from '../../../shared/api/account/AccountTypes';
import { mutationQueue, type QueuedMutation } from './mutationQueue';
import { localAuthStore } from './localAuthStore';
import { remapBusinessContext } from './remapBusinessContext';
import { persistLoginCredentials } from './deviceCredentials';

export function isAuthRegisterMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/businesses/register';
}

export function isAuthLoginMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/auth/login';
}

export function isAuthMutation(m: QueuedMutation): boolean {
  return isAuthRegisterMutation(m) || isAuthLoginMutation(m);
}

function extractAuthUser(data: AuthResponse): AuthUser {
  const userData = data.user?.data ?? data.user;
  if (userData.business && typeof userData.business === 'object' && 'data' in userData.business) {
    userData.business = (userData.business as { data: AuthUser['business'] }).data;
  }
  return userData;
}

async function applyServerAuth(
  user: AuthUser,
  token: string,
  password: string,
  remap?: { oldBusinessId: number; newBusinessId: number; oldUserId: number; newUserId: number },
): Promise<void> {
  if (remap) {
    await remapBusinessContext(remap.oldBusinessId, remap.newBusinessId, remap.oldUserId, remap.newUserId);
  }

  await persistLoginCredentials({
    email: user.email,
    password,
    user,
    token,
    isLocalSession: false,
    pendingAuthSync: false,
  });

  store.dispatch(loginSuccess({
    user,
    token,
    isLocalSession: false,
    pendingAuthSync: false,
  }));
}

async function processAuthRegister(m: QueuedMutation): Promise<boolean> {
  const payload = m.data as BusinessRegisterRequest;
  const authRecord = await localAuthStore.getByMutationId(m.id);

  try {
    await mutationQueue.markSyncing(m.id);
    if (authRecord) await localAuthStore.markSyncing(authRecord.localId);

    await axiosInstance.post('/businesses/register', payload, { skipAuthRedirect: true } as never);
    const { data } = await axiosInstance.post<AuthResponse>(
      '/auth/login',
      { email: payload.email, password: payload.password } satisfies LoginRequest,
      { skipAuthRedirect: true } as never,
    );

    const user = extractAuthUser(data);
    const token = data.token;
    const oldBusinessId = authRecord?.localBusinessId ?? store.getState().auth.user?.business_id ?? 0;
    const oldUserId = authRecord?.localUserId ?? store.getState().auth.user?.id ?? 0;

    if (typeof oldBusinessId === 'number' && oldBusinessId < 0 && user.business_id && user.id) {
      await applyServerAuth(user, token, payload.password, {
        oldBusinessId,
        newBusinessId: user.business_id,
        oldUserId,
        newUserId: user.id,
      });
    } else {
      await applyServerAuth(user, token, payload.password);
    }

    await mutationQueue.markCompleted(m.id);
    await mutationQueue.remove(m.id);

    if (authRecord) {
      await localAuthStore.markSynced(authRecord.localId, user.business_id ?? 0, user.id, user);
    }

    return true;
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>;
    const message = err.response?.data?.message || err.message || 'Account sync failed';
    await mutationQueue.markFailed(m.id, message);
    if (authRecord) await localAuthStore.markFailed(authRecord.localId, message);
    return false;
  }
}

async function processAuthLogin(m: QueuedMutation): Promise<boolean> {
  const payload = m.data as LoginRequest;

  try {
    await mutationQueue.markSyncing(m.id);
    const { data } = await axiosInstance.post<AuthResponse>('/auth/login', payload, { skipAuthRedirect: true } as never);
    const user = extractAuthUser(data);
    await applyServerAuth(user, data.token, payload.password);
    await mutationQueue.markCompleted(m.id);
    await mutationQueue.remove(m.id);

    return true;
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string }>;
    const message = err.response?.data?.message || err.message || 'Login sync failed';
    await mutationQueue.markFailed(m.id, message);
    return false;
  }
}

export interface AuthSyncResult {
  synced: number;
  failed: number;
  blocked: boolean;
}

export async function syncAuthMutations(): Promise<AuthSyncResult> {
  const pending = await mutationQueue.getPending();
  const authMutations = pending
    .filter(isAuthMutation)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (authMutations.length === 0) {
    return { synced: 0, failed: 0, blocked: false };
  }

  let synced = 0;
  let failed = 0;
  let blocked = false;

  for (const mutation of authMutations) {
    const ok = isAuthRegisterMutation(mutation)
      ? await processAuthRegister(mutation)
      : await processAuthLogin(mutation);

    if (ok) {
      synced++;
    } else {
      failed++;
      if (isAuthRegisterMutation(mutation)) {
        blocked = true;
        break;
      }
    }
  }

  return { synced, failed, blocked };
}
