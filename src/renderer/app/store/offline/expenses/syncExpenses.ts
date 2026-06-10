import { axiosInstance } from '../../../api/axiosConfig';
import { mutationQueue } from '../sync/mutationQueue';
import { localExpensesStore } from './localExpensesStore';
import { buildExpenseFormData } from './completeOfflineExpense';
import type { QueuedMutation } from '../sync/mutationQueue';
import type { Expense, ExpenseFormPayload } from '../../../../modules/expenses/api/ExpenseTypes';
import {
  AuthSyncPauseError,
  extractErrorMessage,
  isAuthHttpError,
  isNetworkOrServerError,
} from '../sync/syncErrorUtils';
import { commitMutationQueueEntry, commitMutationQueueEntryIfPresent } from '../sync/syncMutationFinalize';
import { invalidateAfterItemCommitted } from '../sync/syncCacheRefresh';

function isExpenseFormPayload(data: unknown): data is ExpenseFormPayload {
  return Boolean(data && typeof data === 'object' && 'fields' in data);
}

function isExpenseCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/expenses';
}

function isExpenseMutation(m: QueuedMutation): boolean {
  return /^\/expenses(\/-?\d+)?$/.test(m.url);
}

function remapExpensePayload(
  m: QueuedMutation,
  idMap: Map<number, number>,
  expCatIdMap: Map<number, number>,
): QueuedMutation {
  if (m.method !== 'POST' || !isExpenseFormPayload(m.data)) return m;

  const payload: ExpenseFormPayload = {
    ...m.data,
    fields: { ...m.data.fields },
  };
  const rawShiftId = payload.fields.shift_id;
  const shiftId = rawShiftId ? Number(rawShiftId) : null;
  if (shiftId && shiftId < 0 && idMap.has(shiftId)) {
    payload.fields.shift_id = String(idMap.get(shiftId)!);
  }
  const rawCategoryId = payload.fields.expense_category_id;
  const categoryId = rawCategoryId ? Number(rawCategoryId) : null;
  if (categoryId && categoryId < 0 && expCatIdMap.has(categoryId)) {
    payload.fields.expense_category_id = String(expCatIdMap.get(categoryId)!);
  }
  return { ...m, data: payload };
}

async function commitExpenseSync(mutationId: string): Promise<void> {
  await commitMutationQueueEntry(mutationId);
  await localExpensesStore.removeByMutationId(mutationId);
  void invalidateAfterItemCommitted().catch(() => undefined);
}

async function reconcileDuplicateExpenseCreate(m: QueuedMutation, message: string): Promise<boolean> {
  if (!isExpenseCreateMutation(m)) return false;
  if (!/duplicate|already|exists|unique/i.test(message)) return false;

  const committed = await commitMutationQueueEntryIfPresent(m.id);
  if (committed) {
    await localExpensesStore.removeByMutationId(m.id);
    void invalidateAfterItemCommitted().catch(() => undefined);
  }
  return committed;
}

/** After timeout, server may have saved the expense — match before retrying POST. */
async function reconcileExpenseAlreadyOnServer(m: QueuedMutation): Promise<boolean> {
  if (!isExpenseCreateMutation(m) || !isExpenseFormPayload(m.data)) return false;

  const localRecord = (await localExpensesStore.getAll()).find((r) => r.mutationId === m.id);
  if (!localRecord) return false;

  const shiftId = Number(m.data.fields.shift_id);
  if (!Number.isFinite(shiftId) || shiftId <= 0) return false;

  try {
    const { data } = await axiosInstance.get<{ data?: Expense[] }>(`/expenses?shift_id=${shiftId}`, {
      skipAuthRedirect: true,
    } as never);
    const serverList = data.data ?? [];
    const local = localRecord.expense;
    const localDate = (local.expense_date ?? '').slice(0, 10);
    const localAmount = String(local.amount);

    const match = serverList.find((row) => {
      const rowDate = (row.expense_date ?? '').slice(0, 10);
      return (
        row.description === local.description
        && String(row.amount) === localAmount
        && rowDate === localDate
      );
    });

    if (!match) return false;

    await commitExpenseSync(m.id);
    return true;
  } catch {
    return false;
  }
}

async function markExpenseFailed(m: QueuedMutation, message: string): Promise<void> {
  await mutationQueue.markFailed(m.id, message);
  await localExpensesStore.markFailedByMutationId(m.id);
}

async function syncSingleExpenseMutation(
  m: QueuedMutation,
  idMap: Map<number, number>,
  expCatIdMap: Map<number, number>,
): Promise<boolean> {
  const remapped = remapExpensePayload(m, idMap, expCatIdMap);

  if (isExpenseCreateMutation(remapped) && isExpenseFormPayload(remapped.data)) {
    const shiftId = Number(remapped.data.fields.shift_id);
    if (Number.isFinite(shiftId) && shiftId < 0 && !idMap.has(shiftId)) {
      return false;
    }
  }

  const queued = await mutationQueue.getById(remapped.id);
  if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) {
    return true;
  }

  try {
    await mutationQueue.markSyncing(remapped.id);

    const config: {
      method: QueuedMutation['method'];
      url: string;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      method: remapped.method,
      url: remapped.url,
      data: remapped.data,
      headers: remapped.headers,
    };

    if (remapped.method === 'POST' && isExpenseFormPayload(remapped.data)) {
      config.data = buildExpenseFormData(
        remapped.data,
        remapped.url === '/expenses' ? undefined : { methodOverride: 'PUT' },
      );
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    await axiosInstance({ ...config, skipAuthRedirect: true } as never);
    await commitExpenseSync(remapped.id);
    return true;
  } catch (error: unknown) {
    if (isAuthHttpError(error)) {
      throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
    }

    const err = error as {
      response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
      message?: string;
    };
    const validationMessage = err?.response?.data?.errors
      ? Object.values(err.response.data.errors).flat().join(' ')
      : undefined;
    const message = validationMessage || err?.response?.data?.message || err?.message || 'Expense sync failed';

    if (await reconcileDuplicateExpenseCreate(remapped, message)) return true;
    if (isNetworkOrServerError(error) && (await reconcileExpenseAlreadyOnServer(remapped))) return true;

    await markExpenseFailed(remapped, message);
    return false;
  }
}

export async function processExpenseMutations(
  expenseMutations: QueuedMutation[],
  idMap: Map<number, number>,
  expCatIdMap: Map<number, number>,
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  const sorted = [...expenseMutations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const m of sorted) {
    if (!isExpenseMutation(m)) continue;
    try {
      const ok = await syncSingleExpenseMutation(m, idMap, expCatIdMap);
      if (ok) synced++;
      else failed++;
    } catch (error: unknown) {
      if (error instanceof AuthSyncPauseError) throw error;
      failed++;
    }
  }

  return { synced, failed };
}
