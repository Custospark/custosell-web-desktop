import type { LoginRequest } from '../../../shared/api/account/AccountTypes';
import type { AuthUser } from '../slices/authSlice';
import { mutationQueue } from './mutationQueue';
import { localAuthStore } from './localAuthStore';
import { verifyPassword } from './passwordVerifier';
import { persistLoginCredentials } from './deviceCredentials';
import { createLocalSessionToken } from './offlineAuthUtils';

export interface OfflineLoginResult {
  user: AuthUser;
  token: string;
  pendingAuthSync: boolean;
}

export async function completeOfflineLogin(credentials: LoginRequest): Promise<OfflineLoginResult> {
  const record = await localAuthStore.getByEmail(credentials.email);
  if (!record) {
    throw new Error('No account found on this device. Connect to the internet to sign in.');
  }

  const valid = await verifyPassword(credentials.password, record.passwordVerifier);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  if (record.kind === 'pending_registration') {
    const user = record.userSnapshot;
    if (!user || record.localBusinessId == null || record.localUserId == null) {
      throw new Error('Offline account data is incomplete. Please register again.');
    }

    const token = createLocalSessionToken();
    await persistLoginCredentials({
      email: credentials.email,
      password: credentials.password,
      user,
      token,
      isLocalSession: true,
      pendingAuthSync: true,
    });

    return { user, token, pendingAuthSync: true };
  }

  const user = record.userSnapshot;
  if (!user) {
    throw new Error('Sign in online once while connected, then you can use offline login.');
  }

  const token = createLocalSessionToken();
  await mutationQueue.enqueue({
    method: 'POST',
    url: '/auth/login',
    data: credentials,
    maxRetries: 10,
  });

  await persistLoginCredentials({
    email: credentials.email,
    password: credentials.password,
    user,
    token,
    isLocalSession: true,
    pendingAuthSync: false,
  });

  return { user, token, pendingAuthSync: false };
}
