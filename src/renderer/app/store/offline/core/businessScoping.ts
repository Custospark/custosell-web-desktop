import { getOfflineDb } from './offlineDb';
import { store } from '../../store';

/** Active business id from auth state (0 when none / not yet bound). */
export function getActiveBusinessId(): number | undefined {
  const user = store.getState().auth.user;
  return user?.business_id ?? undefined;
}

function currentBusinessId(): number | undefined {
  return getActiveBusinessId();
}

/** Generic helper for business-scoped local record stores. */
export const scopedStore = {
  currentBusinessId,

  async getAll<T extends { businessId?: number }>(storeName: string): Promise<T[]> {
    const db = await getOfflineDb();
    const all = (await db.getAll(storeName)) as T[];
    const bid = currentBusinessId();
    if (bid == null) return all;
    return all.filter((r) => r.businessId == null || r.businessId === bid);
  },

  async getPending<T extends { businessId?: number; syncStatus: string }>(storeName: string): Promise<T[]> {
    const all = await this.getAll<T>(storeName);
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },
};
