import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import { setActiveOrderId } from '../../../../modules/sales/api/salesSlice';
import { updateShiftContext } from '../../slices/authSlice';
import { persistAuthSnapshot } from '../auth/persistAuthSnapshot';
import { mutationQueue } from './mutationQueue';
import type { QueuedMutation } from './mutationQueue';
import { localSalesStore } from '../sales/localSalesStore';
import { localOrdersStore } from '../sales/localOrdersStore';
import { localShiftsStore } from '../sales/localShiftsStore';
import { localProductsStore } from '../inventory/localProductsStore';
import { localCategoriesStore } from '../inventory/localCategoriesStore';
import { localExpensesStore } from '../expenses/localExpensesStore';
import { localExpenseCategoriesStore } from '../expenses/localExpenseCategoriesStore';
import { localRolesStore } from '../settings/localRolesStore';
import { localStaffStore } from '../settings/localStaffStore';
import { commitMutationQueueEntry } from './syncMutationFinalize';
import { invalidateAfterItemCommitted } from './syncCacheRefresh';
import { refreshExpenseCategoriesSnapshot } from '../catalogs/expensesCatalogSnapshot';
import {
  extractCategory,
  extractExpenseCategory,
  extractOrder,
  extractRole,
  extractShift,
} from './syncExtractors';

export function remapShiftCloseUrl(url: string, idMap: Map<number, number>): string {
  const match = url.match(/^\/shifts\/(-?\d+)$/);
  if (!match) return url;
  const localId = Number(match[1]);
  const serverId = idMap.get(localId) ?? localId;
  return `/shifts/${serverId}`;
}

export function remapOrderScopedUrl(url: string, idMap: Map<number, number>): string {
  const updateMatch = url.match(/^\/orders\/(-?\d+)$/);
  if (updateMatch) {
    const localId = Number(updateMatch[1]);
    return `/orders/${idMap.get(localId) ?? localId}`;
  }
  const cancelMatch = url.match(/^\/orders\/(-?\d+)\/cancel$/);
  if (cancelMatch) {
    const localId = Number(cancelMatch[1]);
    return `/orders/${idMap.get(localId) ?? localId}/cancel`;
  }
  return url;
}

export async function processShiftOpens(
  shiftOpens: QueuedMutation[],
): Promise<{ synced: number; failed: number; idMap: Map<number, number> }> {
  const idMap = new Map<number, number>();
  let synced = 0;
  let failed = 0;

  for (const m of shiftOpens) {
    const queued = await mutationQueue.getById(m.id);
    if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) continue;

    const localRecord = await localShiftsStore.getByMutationId(m.id);
    const oldShiftId = localRecord?.shiftId;

    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/shifts', m.data, { skipAuthRedirect: true });
      const serverShift = extractShift(response.data);
      await commitMutationQueueEntry(m.id);
      await localShiftsStore.removeByMutationId(m.id);

      if (oldShiftId && serverShift?.id && oldShiftId !== serverShift.id) {
        idMap.set(oldShiftId, serverShift.id);
        await localSalesStore.updateShiftIdInPending(oldShiftId, serverShift.id);
        await localExpensesStore.updateShiftIdInPending(oldShiftId, serverShift.id);
        await mutationQueue.remapShiftId(oldShiftId, serverShift.id);

        const authUser = store.getState().auth.user;
        if (authUser?.shift_id === oldShiftId) {
          store.dispatch(
            updateShiftContext({
              shift_id: serverShift.id,
              shift_clock_in: serverShift.clock_in,
            }),
          );
          void persistAuthSnapshot().catch(() => undefined);
        }
      }

      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Shift open sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localShiftsStore.markFailedByMutationId(m.id);
      failed++;
    }
  }

  return { synced, failed, idMap };
}

export async function processCategoryCreates(
  categoryCreates: QueuedMutation[],
): Promise<{ synced: number; failed: number; idMap: Map<number, number> }> {
  const idMap = new Map<number, number>();
  let synced = 0;
  let failed = 0;

  for (const m of categoryCreates) {
    const queued = await mutationQueue.getById(m.id);
    if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) continue;

    const localRecord = (await localCategoriesStore.getAll()).find((r) => r.mutationId === m.id);
    const oldCategoryId = localRecord?.category.id ?? null;

    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/categories', m.data, { skipAuthRedirect: true });
      const serverCategory = extractCategory(response.data);
      await commitMutationQueueEntry(m.id);
      await localCategoriesStore.removeByMutationId(m.id);

      if (oldCategoryId && serverCategory?.id && oldCategoryId !== serverCategory.id) {
        idMap.set(oldCategoryId, serverCategory.id);
        await localProductsStore.updateCategoryIdInPending(oldCategoryId, serverCategory.id);
        await mutationQueue.remapCategoryIdInProducts(oldCategoryId, serverCategory.id);
      }

      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Category sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localCategoriesStore.markFailedByMutationId(m.id);
      failed++;
    }
  }

  return { synced, failed, idMap };
}

export async function processExpenseCategoryCreates(
  categoryCreates: QueuedMutation[],
): Promise<{ synced: number; failed: number; idMap: Map<number, number> }> {
  const idMap = new Map<number, number>();
  let synced = 0;
  let failed = 0;

  for (const m of categoryCreates) {
    const queued = await mutationQueue.getById(m.id);
    if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) continue;

    const localRecord = (await localExpenseCategoriesStore.getAll()).find((r) => r.mutationId === m.id);
    const oldCategoryId = localRecord?.category.id ?? null;

    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/expense-categories', m.data, { skipAuthRedirect: true });
      const serverCategory = extractExpenseCategory(response.data);
      await commitMutationQueueEntry(m.id);
      await localExpenseCategoriesStore.removeByMutationId(m.id);

      if (oldCategoryId && serverCategory?.id && oldCategoryId !== serverCategory.id) {
        idMap.set(oldCategoryId, serverCategory.id);
        await localExpensesStore.updateCategoryIdInPending(oldCategoryId, serverCategory.id);
        await mutationQueue.remapExpenseCategoryIdInExpenses(oldCategoryId, serverCategory.id);
      }

      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Expense category sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localExpenseCategoriesStore.markFailedByMutationId(m.id);
      failed++;
    }
  }

  if (synced > 0) {
    void refreshExpenseCategoriesSnapshot();
  }

  return { synced, failed, idMap };
}

export async function processRoleCreates(
  roleCreates: QueuedMutation[],
): Promise<{ synced: number; failed: number; idMap: Map<number, number> }> {
  const idMap = new Map<number, number>();
  let synced = 0;
  let failed = 0;

  for (const m of roleCreates) {
    const queued = await mutationQueue.getById(m.id);
    if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) continue;

    const localRecord = (await localRolesStore.getAll()).find((r) => r.mutationId === m.id);
    const oldRoleId = localRecord?.role.id ?? null;

    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/roles', m.data, { skipAuthRedirect: true });
      const serverRole = extractRole(response.data);
      await commitMutationQueueEntry(m.id);
      await localRolesStore.removeByMutationId(m.id);

      if (oldRoleId && serverRole?.id && oldRoleId !== serverRole.id) {
        idMap.set(oldRoleId, serverRole.id);
        await localStaffStore.updateRoleIdInPending(oldRoleId, serverRole.id);
        await mutationQueue.remapRoleIdInStaff(oldRoleId, serverRole.id);
      }

      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Role sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localRolesStore.markFailedByMutationId(m.id, message);
      failed++;
    }
  }

  return { synced, failed, idMap };
}

export async function processOrderCreates(
  orderCreates: QueuedMutation[],
): Promise<{ synced: number; failed: number; idMap: Map<number, number> }> {
  const idMap = new Map<number, number>();
  let synced = 0;
  let failed = 0;

  for (const m of orderCreates) {
    const queued = await mutationQueue.getById(m.id);
    if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) continue;

    const localRecord = (await localOrdersStore.getPending()).find((r) => r.mutationId === m.id);
    const oldOrderId = localRecord?.order.id ?? null;

    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/orders', m.data, { skipAuthRedirect: true });
      const serverOrder = extractOrder(response.data);
      await commitMutationQueueEntry(m.id);
      await localOrdersStore.removeByMutationId(m.id);

      if (oldOrderId && serverOrder?.id && oldOrderId !== serverOrder.id) {
        idMap.set(oldOrderId, serverOrder.id);
        await localSalesStore.updateOrderIdInPending(oldOrderId, serverOrder.id);
        await mutationQueue.remapOrderId(oldOrderId, serverOrder.id);

        const activeOrderId = store.getState().sales.activeOrderId;
        if (activeOrderId === oldOrderId) {
          store.dispatch(setActiveOrderId(serverOrder.id));
        }
      }

      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Order sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localOrdersStore.markFailedByMutationId(m.id, message);
      failed++;
    }
  }

  return { synced, failed, idMap };
}