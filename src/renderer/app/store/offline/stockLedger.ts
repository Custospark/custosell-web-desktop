import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'CustosellOffline';
const DB_VERSION = 3;

interface StockEntry {
  productId: number;
  quantity: number;
  updatedAt: string;
}

export type SyncStatus = 'pending' | 'synced';

interface PendingAdjustment {
  id: string;
  productId: number;
  delta: number;
  reason: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('stock', { keyPath: 'productId' });
        }
        if (oldVersion < 2) {
          const store = db.createObjectStore('adjustments', { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus');
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('adjustments')) {
            const store = db.createObjectStore('adjustments', { keyPath: 'id' });
            store.createIndex('syncStatus', 'syncStatus');
          }
        }
      },
    });
  }
  return dbPromise;
}

export const stockLedger = {
  async get(productId: number): Promise<number | null> {
    const db = await getDb();
    const entry = await db.get('stock', productId);
    return entry?.quantity ?? null;
  },

  async set(productId: number, quantity: number): Promise<void> {
    const db = await getDb();
    await db.put('stock', { productId, quantity, updatedAt: new Date().toISOString() } as StockEntry);
  },

  async adjust(productId: number, delta: number, reason: string): Promise<void> {
    const db = await getDb();
    const current = await db.get('stock', productId);
    const newQty = (current?.quantity ?? 0) + delta;
    await db.put('stock', { productId, quantity: Math.max(0, newQty), updatedAt: new Date().toISOString() } as StockEntry);

    const adjId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    await db.add('adjustments', {
      id: adjId,
      productId,
      delta,
      reason,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending' as SyncStatus,
    } as PendingAdjustment);
  },

  async getPendingAdjustments(): Promise<PendingAdjustment[]> {
    const db = await getDb();
    const all = await db.getAll('adjustments');
    return all.filter((a) => a.syncStatus === 'pending');
  },

  async markAdjustmentSynced(id: string): Promise<void> {
    const db = await getDb();
    const adj = await db.get('adjustments', id);
    if (adj) {
      adj.syncStatus = 'synced';
      await db.put('adjustments', adj);
    }
  },

  async clearSynced(): Promise<void> {
    const db = await getDb();
    const all = await db.getAll('adjustments');
    for (const adj of all) {
      if (adj.syncStatus === 'synced') {
        await db.delete('adjustments', adj.id);
      }
    }
  },
};
