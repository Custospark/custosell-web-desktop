import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'CustosellOffline';
const DB_VERSION = 1;

interface StockEntry {
  productId: number;
  quantity: number;
  updatedAt: string;
}

interface PendingAdjustment {
  id: string;
  productId: number;
  delta: number;
  reason: string;
  createdAt: string;
  synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('stock')) {
          db.createObjectStore('stock', { keyPath: 'productId' });
        }
        if (!db.objectStoreNames.contains('adjustments')) {
          const store = db.createObjectStore('adjustments', { keyPath: 'id' });
          store.createIndex('synced', 'synced');
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
      synced: false,
    } as PendingAdjustment);
  },

  async getPendingAdjustments(): Promise<PendingAdjustment[]> {
    const db = await getDb();
    return db.getAllFromIndex('adjustments', 'synced', false);
  },

  async markAdjustmentSynced(id: string): Promise<void> {
    const db = await getDb();
    const adj = await db.get('adjustments', id);
    if (adj) {
      adj.synced = true;
      await db.put('adjustments', adj);
    }
  },

  async clearSynced(): Promise<void> {
    const db = await getDb();
    const all = await db.getAllFromIndex('adjustments', 'synced', true);
    for (const adj of all) {
      await db.delete('adjustments', adj.id);
    }
  },
};
