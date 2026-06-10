import { store } from '../store';
import { loginSuccess } from '../slices/authSlice';
import type { AuthUser } from '../slices/authSlice';
import { persistLoginCredentials } from './deviceCredentials';
import { remapBusinessContext } from './remapBusinessContext';
import { postSessionUpgradeRefresh } from './sessionRefresh';

export interface ServerAuthRemap {
  oldBusinessId: number;
  newBusinessId: number;
  oldUserId: number;
  newUserId: number;
}

/** Promote local/offline session to a verified server session in Redux + secure storage. */
export async function applyServerAuth(
  user: AuthUser,
  token: string,
  password: string,
  remap?: ServerAuthRemap,
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

  store.dispatch(
    loginSuccess({
      user,
      token,
      isLocalSession: false,
      pendingAuthSync: false,
    }),
  );

  void postSessionUpgradeRefresh(user);
}
