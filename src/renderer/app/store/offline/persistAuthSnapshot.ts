import { store } from '../store';
import { saveAuthSession } from './secureStorage';

export async function persistAuthSnapshot(): Promise<void> {
  const { auth } = store.getState();
  if (!auth.token || !auth.user) return;

  await saveAuthSession({
    token: auth.token,
    user: auth.user,
    isLocalSession: auth.isLocalSession,
    pendingAuthSync: auth.pendingAuthSync,
  });
}
