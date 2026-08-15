import { getOfflineDb } from '../core/offlineDb';
import { getActiveBusinessId } from '../core/businessScoping';

interface StockEntry {
  businessId: number;
  productId: number;
  quantity: number;
  updatedAt: string;
}

export type SyncStatus = 'pending' | 'synced';

export interface PendingAdjustment {
  id: string;
  businessId?: number;
  productId: number;
  delta: number;
  stock_before?: number;
  stock_after?: number;
  reason: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

/** Server already records stock for sale/refund mutations - ledger rows are local-only. */
export function isServerOwnedStockReason(reason: string): boolean {
  return reason === 'sale' || reason === 'refund';
}

function newId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function activeBusinessId(): number {
  return getActiveBusinessId() ?? 0;
}

export const stockLedger = {
  async get(productId: number): Promise<number | null> {
    const db = await getOfflineDb();
    const entry = await db.get('stock', [activeBusinessId(), productId]);
    return entry?.quantity ?? null;
  },

  async getAll(): Promise<Map<number, number>> {
    const db = await getOfflineDb();
    const entries: StockEntry[] = await db.getAllFromIndex('stock', 'businessId', activeBusinessId());
    const map = new Map<number, number>();
    for (const e of entries) {
      map.set(e.productId, e.quantity);
    }
    return map;
  },

  async set(productId: number, quantity: number): Promise<void> {
    const db = await getOfflineDb();
    await db.put('stock', {
      businessId: activeBusinessId(),
      productId,
      quantity,
      updatedAt: new Date().toISOString(),
    } as StockEntry);
  },

  async seedFromProducts(items: { id: number; quantity: number }[]): Promise<void> {
    const db = await getOfflineDb();
    const bid = activeBusinessId();
    const dbLike = db as unknown as {
      transaction: (names: string[] | string, mode?: string) => {
        objectStore: (name: string) => {
          get: (key: unknown) => Promise<{ quantity?: number } | undefined>;
          put: (value: unknown) => Promise<void>;
          add: (value: unknown) => Promise<void>;
        };
        done: Promise<void>;
      };
    };
    const tx = dbLike.transaction('stock', 'readwrite');
    const store = tx.objectStore('stock');
    for (const { id, quantity } of items) {
      const existing = await store.get([bid, id]);
      if (!existing) {
        await store.put({
          businessId: bid,
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
    const bid = activeBusinessId();
    const current = await db.get('stock', [bid, productId]);
    const baseQty = current?.quantity ?? seedQuantity ?? 0;
    const newQty = Math.max(0, baseQty + delta);
    await db.put('stock', { businessId: bid, productId, quantity: newQty, updatedAt: new Date().toISOString() } as StockEntry);

    await db.add('adjustments', {
      id: newId(),
      businessId: bid,
      productId,
      delta,
      stock_before: baseQty,
      stock_after: newQty,
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
    const bid = activeBusinessId();
    const dbLike = db as unknown as {
      transaction: (names: string[] | string, mode?: string) => {
        objectStore: (name: string) => {
          get: (key: unknown) => Promise<{ quantity?: number } | undefined>;
          getAll: () => Promise<unknown[]>;
          put: (value: unknown) => Promise<void>;
          add: (value: unknown) => Promise<void>;
          delete: (key: unknown) => Promise<void>;
        };
        done: Promise<void>;
      };
    };
    const tx = dbLike.transaction(['stock', 'adjustments'], 'readwrite');
    const stockStore = tx.objectStore('stock');
    const adjStore = tx.objectStore('adjustments');
    const now = new Date().toISOString();

    for (const { productId, delta } of items) {
      const current = await stockStore.get([bid, productId]);
      const baseQty = current?.quantity ?? seedQuantities?.get(productId) ?? 0;
      const newQty = Math.max(0, baseQty + delta);
      await stockStore.put({ businessId: bid, productId, quantity: newQty, updatedAt: now } as StockEntry);
      await adjStore.add({
        id: newId(),
        businessId: bid,
        productId,
        delta,
        stock_before: baseQty,
        stock_after: newQty,
        reason,
        createdAt: now,
        syncStatus: 'pending' as SyncStatus,
      } as PendingAdjustment);
    }

    await tx.done;
  },

  async getPendingAdjustments(): Promise<PendingAdjustment[]> {
    const db = await getOfflineDb();
    const all = (await db.getAll('adjustments')) as PendingAdjustment[];
    const bid = activeBusinessId();
    return all.filter(
      (a) => a.syncStatus === 'pending' && (bid === 0 || a.businessId == null || a.businessId === bid),
    );
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
