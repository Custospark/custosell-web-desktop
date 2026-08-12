import { getOfflineDb } from '../core/offlineDb';
import { getActiveBusinessId, scopedStore } from '../core/businessScoping';
import type { CreateCategoryData, Category } from '../../../../modules/inventory/api/products/ProductTypes';

export type LocalCategorySyncStatus = 'pending' | 'synced' | 'failed';

export type CategoryMutationType = 'create' | 'update' | 'delete';

export interface LocalCategoryRecord {
  localId: string;
  businessId?: number;
  mutationId: string;
  mutationType: CategoryMutationType;
  category: Category;
  payload: CreateCategoryData | { id: number };
  syncStatus: LocalCategorySyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type CategoryWithSyncMeta = Category & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toCategoryWithSyncMeta(record: LocalCategoryRecord): CategoryWithSyncMeta {
  return {
    ...record.category,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localCategoriesStore = {
  async save(
    category: Category,
    payload: CreateCategoryData | { id: number },
    mutationId: string,
    mutationType: CategoryMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalCategoryRecord = {
      localId,
      businessId: getActiveBusinessId(),
      mutationId,
      mutationType,
      category,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localCategories', record);
    return localId;
  },

  async getAll(): Promise<LocalCategoryRecord[]> {
    return scopedStore.getAll<LocalCategoryRecord>('localCategories');
  },

  async getPending(): Promise<LocalCategoryRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverCategory?: Partial<Category>,
  ): Promise<number | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCategories');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return null;

    const oldId = record.category.id;
    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverCategory) {
      record.category = { ...record.category, ...serverCategory, id: serverId ?? record.category.id };
    } else if (serverId) {
      record.category = { ...record.category, id: serverId };
    }
    await db.put('localCategories', record);
    return oldId;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCategories');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localCategories', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCategories');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localCategories', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCategories');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localCategories', record.localId);
    }
  },

  async removeByCategoryId(categoryId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localCategories');
    const record = all.find((r) => r.category.id === categoryId);
    if (record) {
      await db.delete('localCategories', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
