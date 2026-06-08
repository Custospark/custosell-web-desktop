import type { BusinessRegisterRequest } from '../../../shared/api/account/AccountTypes';
import type { AuthUser } from '../slices/authSlice';
import { mutationQueue } from './mutationQueue';
import { localAuthStore } from './localAuthStore';
import { hashPassword } from './passwordVerifier';
import { persistLoginCredentials } from './deviceCredentials';
import { buildOfflineAuthUser, createLocalSessionToken } from './offlineAuthUtils';

export interface OfflineRegistrationResult {
  user: AuthUser;
  token: string;
}

export async function completeOfflineRegistration(
  payload: BusinessRegisterRequest,
): Promise<OfflineRegistrationResult> {
  const localBusinessId = -Date.now();
  const localUserId = localBusinessId - 1;
  const token = createLocalSessionToken();
  const user = buildOfflineAuthUser(payload, localBusinessId, localUserId);

  const mutationId = await mutationQueue.enqueue({
    method: 'POST',
    url: '/businesses/register',
    data: payload,
    maxRetries: 10,
  });

  await localAuthStore.savePendingRegistration({
    email: payload.email,
    passwordVerifier: await hashPassword(payload.password),
    registrationPayload: payload,
    mutationId,
    localBusinessId,
    localUserId,
    userSnapshot: user,
  });

  await persistLoginCredentials({
    email: payload.email,
    password: payload.password,
    user,
    token,
    isLocalSession: true,
    pendingAuthSync: true,
  });

  return { user, token };
}
