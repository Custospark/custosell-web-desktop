import { getOfflineDb } from './offlineDb';

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

function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const stockLedger = {
  async get(productId: number): Promise<number | null> {
    const db = await getOfflineDb();
    const entry = await db.get('stock', productId);
    return entry?.quantity ?? null;
  },

  async getAll(): Promise<Map<number, number>> {
    const db = await getOfflineDb();
    const entries: StockEntry[] = await db.getAll('stock');
    const map = new Map<number, number>();
    for (const e of entries) {
      map.set(e.productId, e.quantity);
    }
    return map;
  },

  async set(productId: number, quantity: number): Promise<void> {
    const db = await getOfflineDb();
    await db.put('stock', { productId, quantity, updatedAt: new Date().toISOString() } as StockEntry);
  },

  async seedFromProducts(items: { id: number; quantity: number }[]): Promise<void> {
    const db = await getOfflineDb();
    const tx = db.transaction('stock', 'readwrite');
    const store = tx.objectStore('stock');
    for (const { id, quantity } of items) {
      const existing = await store.get(id);
      if (!existing) {
        await store.put({
          productId: id,
          quantity,
          updatedAt: new Date().toISOString(),
        } as StockEntry);
      }
    }
    await tx.done;
  },

  async adjust(productId: number, delta: number, reason: string, seedQuantity?: number): Promise<void> {
    const db = await getOfflineDb();
    const current = await db.get('stock', productId);
    const baseQty = current?.quantity ?? seedQuantity ?? 0;
    const newQty = Math.max(0, baseQty + delta);
    await db.put('stock', { productId, quantity: newQty, updatedAt: new Date().toISOString() } as StockEntry);

    await db.add('adjustments', {
      id: newId(),
      productId,
      delta,
      reason,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending' as SyncStatus,
    } as PendingAdjustment);
  },

  async batchAdjust(
    items: { productId: number; delta: number }[],
    reason: string,
    seedQuantities?: Map<number, number>,
  ): Promise<void> {
    if (items.length === 0) return;

    const db = await getOfflineDb();
    const tx = db.transaction(['stock', 'adjustments'], 'readwrite');
    const stockStore = tx.objectStore('stock');
    const adjStore = tx.objectStore('adjustments');
    const now = new Date().toISOString();

    for (const { productId, delta } of items) {
      const current = await stockStore.get(productId);
      const baseQty = current?.quantity ?? seedQuantities?.get(productId) ?? 0;
      const newQty = Math.max(0, baseQty + delta);
      await stockStore.put({ productId, quantity: newQty, updatedAt: now } as StockEntry);
      await adjStore.add({
        id: newId(),
        productId,
        delta,
        reason,
        createdAt: now,
        syncStatus: 'pending' as SyncStatus,
      } as PendingAdjustment);
    }

    await tx.done;
  },

  async getPendingAdjustments(): Promise<PendingAdjustment[]> {
    const db = await getOfflineDb();
    const all = await db.getAll('adjustments');
    return all.filter((a) => a.syncStatus === 'pending');
  },

  async markAdjustmentSynced(id: string): Promise<void> {
    const db = await getOfflineDb();
    const adj = await db.get('adjustments', id);
    if (adj) {
      adj.syncStatus = 'synced';
      await db.put('adjustments', adj);
    }
  },

  async clearSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('adjustments');
    for (const adj of all) {
      if (adj.syncStatus === 'synced') {
        await db.delete('adjustments', adj.id);
      }
    }
  },
};
