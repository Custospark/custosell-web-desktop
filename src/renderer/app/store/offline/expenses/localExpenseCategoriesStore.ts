import { getOfflineDb } from '../core/offlineDb';
import { getActiveBusinessId, scopedStore } from '../core/businessScoping';
import type { CreateExpenseCategoryData, ExpenseCategory, ExpenseCategoryWithSyncMeta } from '../../../../modules/expenses/api/ExpenseTypes';

export type LocalExpenseCategorySyncStatus = 'pending' | 'synced' | 'failed';

export type ExpenseCategoryMutationType = 'create' | 'update' | 'delete';

export interface LocalExpenseCategoryRecord {
  localId: string;
  businessId?: number;
  mutationId: string;
  mutationType: ExpenseCategoryMutationType;
  category: ExpenseCategory;
  payload: CreateExpenseCategoryData | { id: number };
  syncStatus: LocalExpenseCategorySyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export function toExpenseCategoryWithSyncMeta(
  record: LocalExpenseCategoryRecord,
): ExpenseCategoryWithSyncMeta {
  return {
    ...record.category,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localExpenseCategoriesStore = {
  async save(
    category: ExpenseCategory,
    payload: CreateExpenseCategoryData | { id: number },
    mutationId: string,
    mutationType: ExpenseCategoryMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalExpenseCategoryRecord = {
      localId,
      businessId: getActiveBusinessId(),
      mutationId,
      mutationType,
      category,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localExpenseCategories', record);
    return localId;
  },

  async getAll(): Promise<LocalExpenseCategoryRecord[]> {
    return scopedStore.getAll<LocalExpenseCategoryRecord>('localExpenseCategories');
  },

  async getPending(): Promise<LocalExpenseCategoryRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverCategory?: Partial<ExpenseCategory>,
  ): Promise<number | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenseCategories');
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
    await db.put('localExpenseCategories', record);
    return oldId;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenseCategories');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localExpenseCategories', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenseCategories');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localExpenseCategories', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenseCategories');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localExpenseCategories', record.localId);
    }
  },

  async removeByCategoryId(categoryId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenseCategories');
    const record = all.find((r) => r.category.id === categoryId);
    if (record) {
      await db.delete('localExpenseCategories', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
