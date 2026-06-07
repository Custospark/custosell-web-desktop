import { getOfflineDb } from './offlineDb';
import type { CreateProductData, UpdateProductData, Product } from '../../../modules/inventory/api/products/ProductTypes';

export type LocalProductSyncStatus = 'pending' | 'synced' | 'failed';

export type ProductMutationType = 'create' | 'update' | 'delete';

export interface LocalProductRecord {
  localId: string;
  mutationId: string;
  mutationType: ProductMutationType;
  product: Product;
  payload: CreateProductData | UpdateProductData | { id: number };
  syncStatus: LocalProductSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type ProductWithSyncMeta = Product & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toProductWithSyncMeta(record: LocalProductRecord): ProductWithSyncMeta {
  return {
    ...record.product,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localProductsStore = {
  async save(
    product: Product,
    payload: CreateProductData | UpdateProductData | { id: number },
    mutationId: string,
    mutationType: ProductMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalProductRecord = {
      localId,
      mutationId,
      mutationType,
      product,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localProducts', record);
    return localId;
  },

  async getAll(): Promise<LocalProductRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localProducts');
  },

  async getPending(): Promise<LocalProductRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverProduct?: Partial<Product>,
  ): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;

    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverProduct) {
      record.product = { ...record.product, ...serverProduct, id: serverId ?? record.product.id };
    } else if (serverId) {
      record.product = { ...record.product, id: serverId };
    }
    await db.put('localProducts', record);
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localProducts', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localProducts', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localProducts', record.localId);
    }
  },

  async updateCategoryIdInPending(oldCategoryId: number, newCategoryId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    for (const record of all) {
      if (record.product.category_id === oldCategoryId) {
        record.product.category_id = newCategoryId;
        if (record.payload && typeof record.payload === 'object' && 'category_id' in record.payload) {
          (record.payload as Record<string, unknown>).category_id = newCategoryId;
        }
        await db.put('localProducts', record);
      }
    }
  },

  async removeByProductId(productId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localProducts');
    const record = all.find((r) => r.product.id === productId);
    if (record) {
      await db.delete('localProducts', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
