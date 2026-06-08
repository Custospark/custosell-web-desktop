import type { AuthUser } from '../slices/authSlice';
import { localAuthStore } from './localAuthStore';
import { hashPassword } from './passwordVerifier';
import { saveAuthSession, type StoredAuthSession } from './secureStorage';

export interface PersistLoginCredentialsInput {
  email: string;
  password: string;
  user: AuthUser;
  token: string;
  isLocalSession: boolean;
  pendingAuthSync: boolean;
}

/**
 * Single entry point: refresh encrypted session + device credential record on every login.
 * Logout clears the session only — credentials stay for offline re-login on this device.
 */
export async function persistLoginCredentials(input: PersistLoginCredentialsInput): Promise<void> {
  const session: StoredAuthSession = {
    token: input.token,
    user: input.user,
    isLocalSession: input.isLocalSession,
    pendingAuthSync: input.pendingAuthSync,
  };
  await saveAuthSession(session);

  const passwordVerifier = await hashPassword(input.password);
  const pending = await localAuthStore.getPendingByEmail(input.email);

  if (pending && input.pendingAuthSync) {
    await localAuthStore.updatePendingCredentials({
      email: input.email,
      passwordVerifier,
      userSnapshot: input.user,
    });
    return;
  }

  if (pending) {
    await localAuthStore.removePendingByEmail(input.email);
  }

  await localAuthStore.saveDeviceLogin({
    email: input.email,
    passwordVerifier,
    userSnapshot: input.user,
    serverBusinessId: input.user.business_id,
    serverUserId: input.user.id,
  });
}

/** Refresh stored user profile after online profile fetch — keeps offline login snapshot current. */
export async function refreshStoredUserSnapshot(email: string, user: AuthUser): Promise<void> {
  await localAuthStore.updateUserSnapshot(email, user);
}
