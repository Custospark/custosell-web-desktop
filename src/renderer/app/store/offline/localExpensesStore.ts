import { getOfflineDb } from './offlineDb';
import type { Expense, ExpenseFormPayload, ExpenseWithSyncMeta } from '../../../modules/expenses/api/ExpenseTypes';

export type LocalExpenseSyncStatus = 'pending' | 'synced' | 'failed';

export type ExpenseMutationType = 'create' | 'update' | 'delete';

export interface LocalExpenseRecord {
  localId: string;
  mutationId: string;
  mutationType: ExpenseMutationType;
  expense: Expense;
  expenseCategoryId: number | null;
  shiftId?: number | null;
  payload: ExpenseFormPayload | { id: number };
  syncStatus: LocalExpenseSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export function toExpenseWithSyncMeta(record: LocalExpenseRecord): ExpenseWithSyncMeta {
  return {
    ...record.expense,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
    _pendingReceipt: record.mutationType !== 'delete'
      && 'receipt' in record.payload
      && Boolean(record.payload.receipt),
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localExpensesStore = {
  async save(
    expense: Expense,
    payload: ExpenseFormPayload | { id: number },
    mutationId: string,
    mutationType: ExpenseMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalExpenseRecord = {
      localId,
      mutationId,
      mutationType,
      expense,
      expenseCategoryId: expense.expense_category_id,
      shiftId: expense.shift_id ?? null,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localExpenses', record);
    return localId;
  },

  async getAll(): Promise<LocalExpenseRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localExpenses');
  },

  async getPending(): Promise<LocalExpenseRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverExpense?: Partial<Expense>,
  ): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;

    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverExpense) {
      record.expense = { ...record.expense, ...serverExpense, id: serverId ?? record.expense.id };
    } else if (serverId) {
      record.expense = { ...record.expense, id: serverId };
    }
    record.expenseCategoryId = record.expense.expense_category_id;
    record.shiftId = record.expense.shift_id ?? null;
    await db.put('localExpenses', record);
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localExpenses', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localExpenses', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localExpenses', record.localId);
    }
  },

  async removeByExpenseId(expenseId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    const record = all.find((r) => r.expense.id === expenseId);
    if (record) {
      await db.delete('localExpenses', record.localId);
      return record.mutationId;
    }
    return null;
  },

  async updateCategoryIdInPending(oldCategoryId: number, newCategoryId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    for (const record of all) {
      if (record.expense.expense_category_id === oldCategoryId) {
        record.expense.expense_category_id = newCategoryId;
        record.expenseCategoryId = newCategoryId;
        if (record.payload && typeof record.payload === 'object' && 'fields' in record.payload) {
          record.payload.fields.expense_category_id = String(newCategoryId);
        }
        await db.put('localExpenses', record);
      }
    }
  },

  async getByShiftId(shiftId: number): Promise<LocalExpenseRecord[]> {
    const all = await this.getPending();
    return all.filter((record) => record.expense.shift_id === shiftId || record.shiftId === shiftId);
  },

  async updateShiftIdInPending(oldShiftId: number, newShiftId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localExpenses');
    for (const record of all) {
      if (record.expense.shift_id === oldShiftId || record.shiftId === oldShiftId) {
        record.expense.shift_id = newShiftId;
        record.shiftId = newShiftId;
        if (record.payload && typeof record.payload === 'object' && 'fields' in record.payload) {
          record.payload.fields.shift_id = String(newShiftId);
        }
        await db.put('localExpenses', record);
      }
    }
  },
};
