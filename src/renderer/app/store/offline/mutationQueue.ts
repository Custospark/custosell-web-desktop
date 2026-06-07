import { getOfflineDb } from './offlineDb';

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
  lastError?: string;
}

function getDb() {
  return getOfflineDb();
}

export const mutationQueue = {
  async enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const db = await getDb();
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const entry: QueuedMutation = {
      ...mutation,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'queued',
    };
    console.log('[MutationQueue] enqueue:', { id, url: mutation.url, method: mutation.method, status: 'queued' });
    await db.add('mutations', entry);
    return id;
  },

  async getAll(): Promise<QueuedMutation[]> {
    const db = await getDb();
    const all = await db.getAll('mutations');
    return all;
  },

  async getPending(): Promise<QueuedMutation[]> {
    const db = await getDb();
    const all = await db.getAll('mutations');
    const pending = all.filter((m) => m.status === 'queued' || m.status === 'failed');
    console.log('[MutationQueue] getPending — total:', all.length, 'pending:', pending.length, 'statuses:', all.map(m => m.status));
    return pending;
  },

  async markSyncing(id: string): Promise<void> {
    const db = await getDb();
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'syncing';
      await db.put('mutations', entry);
    }
  },

  async markCompleted(id: string): Promise<void> {
    const db = await getDb();
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'completed';
      await db.put('mutations', entry);
    }
  },

  async markFailed(id: string, error: string): Promise<void> {
    const db = await getDb();
    const entry = await db.get('mutations', id);
    if (entry) {
      entry.status = 'failed';
      entry.retryCount += 1;
      entry.lastError = error;
      await db.put('mutations', entry);
    }
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('mutations', id);
  },

  async clearCompleted(): Promise<void> {
    const db = await getDb();
    const all = await db.getAll('mutations');
    for (const m of all) {
      if (m.status === 'completed') {
        await db.delete('mutations', m.id);
      }
    }
  },

  async count(): Promise<number> {
    const db = await getDb();
    const all = await db.getAll('mutations');
    return all.filter((m) => m.status === 'queued' || m.status === 'failed').length;
  },
};
