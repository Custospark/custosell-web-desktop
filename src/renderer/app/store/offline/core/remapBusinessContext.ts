import { getOfflineDb } from './offlineDb';
import { mutationQueue } from '../sync/mutationQueue';
import { localAuthStore } from '../auth/localAuthStore';
import type { AuthUser } from '../../slices/authSlice';

function patchEntity<T extends Record<string, unknown>>(
  entity: T,
  oldBusinessId: number,
  newBusinessId: number,
  oldUserId: number,
  newUserId: number,
): T {
  const next = { ...entity } as T & { business_id?: number; user_id?: number; business?: { id?: number } };
  if (next.business_id === oldBusinessId) next.business_id = newBusinessId;
  if (next.user_id === oldUserId) next.user_id = newUserId;
  if (next.business && typeof next.business === 'object' && next.business.id === oldBusinessId) {
    next.business = { ...next.business, id: newBusinessId };
  }
  return next as T;
}

function patchPayload(data: unknown, oldBusinessId: number, newBusinessId: number, oldUserId: number, newUserId: number): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => patchPayload(item, oldBusinessId, newBusinessId, oldUserId, newUserId));
  }

  const record = { ...(data as Record<string, unknown>) };
  if (record.business_id === oldBusinessId) record.business_id = newBusinessId;
  if (record.user_id === oldUserId) record.user_id = newUserId;

  if (record.fields && typeof record.fields === 'object') {
    record.fields = { ...(record.fields as Record<string, unknown>) };
  }

  if (record.items && Array.isArray(record.items)) {
    record.items = record.items.map((item) => patchPayload(item, oldBusinessId, newBusinessId, oldUserId, newUserId));
  }

  return record;
}

async function remapStoreEntities(
  storeName: string,
  entityKey: string,
  oldBusinessId: number,
  newBusinessId: number,
  oldUserId: number,
  newUserId: number,
): Promise<void> {
  const db = await getOfflineDb();
  const all = await db.getAll(storeName) as Array<Record<string, unknown>>;
  for (const record of all) {
    const entity = record[entityKey];
    if (entity && typeof entity === 'object') {
      record[entityKey] = patchEntity(entity as Record<string, unknown>, oldBusinessId, newBusinessId, oldUserId, newUserId);
    }
    if (typeof record.businessId === 'number' && record.businessId === oldBusinessId) {
      record.businessId = newBusinessId;
    }
    await db.put(storeName, record);
  }
}

export async function remapBusinessContext(
  oldBusinessId: number,
  newBusinessId: number,
  oldUserId: number,
  newUserId: number,
): Promise<void> {
  const db = await getOfflineDb();

  await remapStoreEntities('localSales', 'sale', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localRefunds', 'refund', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localShifts', 'shift', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localProducts', 'product', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localCategories', 'category', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localCustomers', 'customer', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localExpenses', 'expense', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localExpenseCategories', 'category', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localRoles', 'role', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localStaff', 'staff', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localBusinessSettings', 'business', oldBusinessId, newBusinessId, oldUserId, newUserId);
  await remapStoreEntities('localOrders', 'order', oldBusinessId, newBusinessId, oldUserId, newUserId);

  const mutations = await mutationQueue.getAll();
  for (const mutation of mutations) {
    if (mutation.data) {
      mutation.data = patchPayload(mutation.data, oldBusinessId, newBusinessId, oldUserId, newUserId);
      await db.put('mutations', mutation);
    }
  }

  const authRecords = await db.getAll('localAuth') as Array<{
    localId: string;
    localBusinessId?: number;
    localUserId?: number;
    userSnapshot?: AuthUser;
  }>;
  for (const record of authRecords) {
    if (record.localBusinessId === oldBusinessId) record.localBusinessId = newBusinessId;
    if (record.localUserId === oldUserId) record.localUserId = newUserId;
    if (record.userSnapshot) {
      record.userSnapshot = patchEntity(
        record.userSnapshot as unknown as Record<string, unknown>,
        oldBusinessId,
        newBusinessId,
        oldUserId,
        newUserId,
      ) as unknown as AuthUser;
    }
    await db.put('localAuth', record);
  }
}

export async function hasPendingRegistrationAuth(): Promise<boolean> {
  return localAuthStore.hasPendingAuth();
}
