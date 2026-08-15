import { isSyncCoordinatorRunning } from './syncCoordinator';
import { getOfflineDb } from '../core/offlineDb';
import type { IDBPDatabase } from 'idb';
import { store } from '../../store';
import { guardScopedMutations } from './syncDependencyGuard';
import { entityIdMapper } from './entityIdMapper';

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'syncing' | 'failed' | 'completed';
  lastAttemptAt?: string;
  lastError?: string;
  businessId?: number;
}

function getActiveBusinessId(): number | undefined {
  return store.getState().auth.user?.business_id ?? undefined;
}

function isAccountScopedAuthMutation(m: QueuedMutation): boolean {
  return (
    (m.method === 'POST' && m.url === '/businesses/register')
    || (m.method === 'POST' && m.url === '/auth/login')
  );
}

function sameBusiness(entry: QueuedMutation): boolean {
  const current = getActiveBusinessId();
  return entry.businessId == null || current == null || entry.businessId === current;
}

type MutableMutationPatch = Partial<Pick<QueuedMutation, 'data' | 'method' | 'url' | 'headers' | 'maxRetries'>>;

const STALE_SYNCING_TIMEOUT_MS = 5 * 60 * 1000;

/** Non-throwing DB access - a broken/unavailable DB resolves to null so the
 *  caller can degrade (empty lists, no-op writes) instead of crashing queries. */
async function tryGetDb(): Promise<IDBPDatabase | null> {
  try {
    return await getOfflineDb();
  } catch (err) {
    console.warn('[MutationQueue] IndexedDB unavailable, mutating in-memory only (non-fatal):', err);
    return null;
  }
}

function isStaleSyncingMutation(mutation: QueuedMutation, now = Date.now()): boolean {
  if (mutation.status !== 'syncing') return false;

  const lastAttemptAt = mutation.lastAttemptAt ?? mutation.createdAt;
  const lastAttemptTime = Date.parse(lastAttemptAt);
  if (Number.isNaN(lastAttemptTime)) return true;

  return now - lastAttemptTime > STALE_SYNCING_TIMEOUT_MS;
}

export const mutationQueue = {
  async enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const db = await tryGetDb();
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const entry: QueuedMutation = {
      ...mutation,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'queued',
      businessId: getActiveBusinessId(),
    };
    console.log('[MutationQueue] enqueue:', { id, url: mutation.url, method: mutation.method, status: 'queued' });
    if (!db) return '';
    await db.add('mutations', entry);
    return id;
  },

  async getAll(): Promise<QueuedMutation[]> {
    const db = await tryGetDb();
    if (!db) return [];
    return db.getAll('mutations');
  },

  async getById(id: string): Promise<QueuedMutation | undefined> {
    const db = await tryGetDb();
    if (!db) return undefined;
    return db.get('mutations', id);
  },

  async getPending(): Promise<QueuedMutation[]> {
    const db = await tryGetDb();
    if (!db) return [];
    const all = await db.getAll('mutations');
    const now = Date.now();
    const coordinatorActive = isSyncCoordinatorRunning();
    const currentBusinessId = getActiveBusinessId();

    for (const mutation of all) {
      if (isStaleSyncingMutation(mutation, now)) {
        if (coordinatorActive) continue;
        mutation.status = 'queued';
        mutation.lastError = 'Previous sync attempt timed out';
        await db.put('mutations', mutation);
      }
    }

    const scoped = all.filter(
      (m) =>
        m.status === 'queued'
        && (isAccountScopedAuthMutation(m) || m.businessId == null || m.businessId === currentBusinessId),
    );

    const guarded = await guardScopedMutations(scoped, currentBusinessId);
    return guarded;
  },

  async markSyncing(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'syncing';
      entry.lastAttemptAt = new Date().toISOString();
      await db.put('mutations', entry);
    }
  },

  async markCompleted(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'completed';
      await db.put('mutations', entry);
    }
  },

  async markFailed(id: string, error: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'failed';
      entry.retryCount += 1;
      entry.lastError = error;
      await db.put('mutations', entry);
    }
  },

  async updateMutation(id: string, patch: MutableMutationPatch): Promise<QueuedMutation> {
    const db = await tryGetDb();
    if (!db) {
      throw new Error('Queued mutation not found');
    }
    const entry = await db.get('mutations', id);
    if (!entry) {
      throw new Error('Queued mutation not found');
    }
    if (entry.status === 'completed') {
      throw new Error('Completed mutations cannot be updated');
    }
    if (entry.status === 'syncing') {
      throw new Error('Sync in progress; try again shortly');
    }

    if ('data' in patch) entry.data = patch.data;
    if ('method' in patch && patch.method) entry.method = patch.method;
    if ('url' in patch && patch.url) entry.url = patch.url;
    if ('headers' in patch) entry.headers = patch.headers;
    if ('maxRetries' in patch && typeof patch.maxRetries === 'number') entry.maxRetries = patch.maxRetries;

    await db.put('mutations', entry);
    return entry;
  },

  async requeue(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) {
      throw new Error('Queued mutation not found');
    }
    const entry = await db.get('mutations', id);
    if (!entry) {
      throw new Error('Queued mutation not found');
    }
    if (entry.status === 'completed') {
      throw new Error('Completed mutations cannot be requeued');
    }
    if (entry.status === 'syncing') {
      throw new Error('Sync in progress; try again shortly');
    }

    entry.status = 'queued';
    entry.lastError = undefined;
    entry.lastAttemptAt = undefined;
    entry.retryCount = 0;
    await db.put('mutations', entry);
  },

  /**
   * Return a failed mutation to the queue WITHOUT resetting retryCount, so a
   * dependency re-drive still honors maxRetries and cannot loop forever.
   */
  async requeueKeepRetries(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) {
      throw new Error('Queued mutation not found');
    }
    const entry = await db.get('mutations', id);
    if (!entry) {
      throw new Error('Queued mutation not found');
    }
    if (entry.status === 'completed') {
      throw new Error('Completed mutations cannot be requeued');
    }
    if (entry.status === 'syncing') {
      throw new Error('Sync in progress; try again shortly');
    }

    entry.status = 'queued';
    entry.lastError = undefined;
    entry.lastAttemptAt = undefined;
    await db.put('mutations', entry);
  },

  async remove(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    await db.delete('mutations', id);
  },

  async clearCompleted(): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');
    for (const m of all) {
      if (m.status === 'completed') {
        await db.delete('mutations', m.id);
      }
    }
  },

  async count(): Promise<number> {
    const db = await tryGetDb();
    if (!db) return 0;
    const all = await db.getAll('mutations');
    const now = Date.now();
    return all.filter((m) => m.status === 'queued' || isStaleSyncingMutation(m, now)).length;
  },

  async removeById(id: string): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    await db.delete('mutations', id);
  },

  async remapCategoryIdInProducts(oldCategoryId: number, newCategoryId: number): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');

    for (const entry of all) {
      if (!sameBusiness(entry)) continue;
      if (entry.method === 'POST' && entry.url === '/products' && entry.data) {
        const payload = entry.data as { category_id?: number | null };
        if (payload.category_id === oldCategoryId) {
          payload.category_id = newCategoryId;
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }
    }

    await entityIdMapper.rememberId('category', oldCategoryId, newCategoryId, getActiveBusinessId());
  },

  async remapExpenseCategoryIdInExpenses(oldCategoryId: number, newCategoryId: number): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');

    for (const entry of all) {
      if (!sameBusiness(entry)) continue;
      if (entry.method === 'POST' && /^\/expenses(\/-?\d+)?$/.test(entry.url) && entry.data) {
        const payload = entry.data as { fields?: { expense_category_id?: string } };
        if (payload.fields?.expense_category_id === String(oldCategoryId)) {
          payload.fields.expense_category_id = String(newCategoryId);
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }
    }

    await entityIdMapper.rememberId('expense-category', oldCategoryId, newCategoryId, getActiveBusinessId());
  },

  async remapRoleIdInStaff(oldRoleId: number, newRoleId: number): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');

    for (const entry of all) {
      if (!sameBusiness(entry)) continue;
      if ((entry.method === 'POST' || entry.method === 'PUT') && /^\/users(\/-?\d+)?$/.test(entry.url) && entry.data) {
        const payload = entry.data as { role_id?: number };
        if (payload.role_id === oldRoleId) {
          payload.role_id = newRoleId;
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }
    }

    await entityIdMapper.rememberId('role', oldRoleId, newRoleId, getActiveBusinessId());
  },

  async remapShiftId(oldShiftId: number, newShiftId: number): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');

    for (const entry of all) {
      if (!sameBusiness(entry)) continue;

      if (entry.method === 'PUT' && entry.url === `/shifts/${oldShiftId}`) {
        entry.url = `/shifts/${newShiftId}`;
        await db.put('mutations', entry);
        continue;
      }

      if (entry.method === 'POST' && entry.url === '/sales' && entry.data) {
        const payload = entry.data as { shift_id?: number | null };
        if (payload.shift_id === oldShiftId) {
          payload.shift_id = newShiftId;
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }

      if ((entry.method === 'POST' || entry.method === 'PUT') && /^\/expenses(\/-?\d+)?$/.test(entry.url) && entry.data) {
        const payload = entry.data as { fields?: { shift_id?: string } };
        if (payload.fields?.shift_id === String(oldShiftId)) {
          payload.fields.shift_id = String(newShiftId);
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }
    }

    await entityIdMapper.rememberId('shift', oldShiftId, newShiftId, getActiveBusinessId());
  },

  async remapOrderId(oldOrderId: number, newOrderId: number): Promise<void> {
    const db = await tryGetDb();
    if (!db) return;
    const all = await db.getAll('mutations');

    for (const entry of all) {
      if (!sameBusiness(entry)) continue;

      if (entry.method === 'PUT' && entry.url === `/orders/${oldOrderId}`) {
        entry.url = `/orders/${newOrderId}`;
        await db.put('mutations', entry);
        continue;
      }

      if (entry.method === 'POST' && entry.url === `/orders/${oldOrderId}/cancel`) {
        entry.url = `/orders/${newOrderId}/cancel`;
        await db.put('mutations', entry);
        continue;
      }

      if (entry.method === 'POST' && entry.url === '/sales' && entry.data) {
        const payload = entry.data as { order_id?: number | null };
        if (payload.order_id === oldOrderId) {
          payload.order_id = newOrderId;
          entry.data = payload;
          await db.put('mutations', entry);
        }
      }
    }

    await entityIdMapper.rememberId('order', oldOrderId, newOrderId, getActiveBusinessId());
  },
};
