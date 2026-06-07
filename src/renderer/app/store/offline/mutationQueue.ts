import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'CustosellOffline';
const DB_VERSION = 3;

export interface QueuedMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'syncing' | 'failed' | 'completed';
  lastError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('stock', { keyPath: 'productId' });
          const adjStore = db.createObjectStore('adjustments', { keyPath: 'id' });
          adjStore.createIndex('syncStatus', 'syncStatus');
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('adjustments')) {
            const adjStore = db.createObjectStore('adjustments', { keyPath: 'id' });
            adjStore.createIndex('syncStatus', 'syncStatus');
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('mutations')) {
            db.createObjectStore('mutations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('adjustments')) {
            const adjStore = db.createObjectStore('adjustments', { keyPath: 'id' });
            adjStore.createIndex('syncStatus', 'syncStatus');
          }
          if (!db.objectStoreNames.contains('stock')) {
            db.createObjectStore('stock', { keyPath: 'productId' });
          }
        }
      },
    });
  }
  return dbPromise;
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
    await db.add('mutations', entry);
    return id;
  },

  async getAll(): Promise<QueuedMutation[]> {
    const db = await getDb();
    return db.getAll('mutations');
  },

  async getPending(): Promise<QueuedMutation[]> {
    const db = await getDb();
    const all = await db.getAll('mutations');
    return all.filter((m) => m.status === 'queued' || m.status === 'failed');
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
