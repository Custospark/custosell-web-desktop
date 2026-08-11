import { mutationQueue } from './mutationQueue';
import type { QueuedMutation } from './mutationQueue';
import { localSalesStore } from '../sales/localSalesStore';
import { localExpensesStore } from '../expenses/localExpensesStore';
import type { SyncProgressReporter } from './syncProgressReporter';
import { AuthSyncPauseError } from './syncErrorUtils';
import { isAuthMutation } from '../auth/syncAuthEngine';
import { processExpenseMutations } from '../expenses/syncExpenses';
import { processSalesInChunks } from '../sales/syncSalesBatch';
import {
  getSaleIdFromScopedUrl,
  isSalePaymentMutation,
  isSaleScopedMutation,
  remapSaleScopedUrl,
} from './saleSyncRemap';
import {
  isCategoryCreateMutation,
  isExpenseCategoryCreateMutation,
  isExpenseMutation,
  isOrderCreateMutation,
  isProductCreateMutation,
  isRefundMutation,
  isRoleCreateMutation,
  isSaleMutation,
  isShiftCloseMutation,
  isShiftOpenMutation,
  isStaffCreateMutation,
} from './syncMutators';
import {
  processCategoryCreates,
  processExpenseCategoryCreates,
  processOrderCreates,
  processRoleCreates,
  processShiftOpens,
  remapOrderScopedUrl,
  remapShiftCloseUrl,
} from './syncCreateProcessors';
import { processMutation } from './syncMutationRunner';
import { processStockAdjustments } from './syncStock';

async function isSaleScopedMutationBlocked(m: QueuedMutation): Promise<boolean> {
  const saleId = getSaleIdFromScopedUrl(m.url);
  if (!saleId || saleId > 0) return false;
  const pending = await localSalesStore.getPending();
  return pending.some((r) => r.sale.id === saleId && r.syncStatus === 'pending');
}

function needsSaleIdRemap(m: QueuedMutation, saleIdMap: Map<number, number>): boolean {
  const saleId = getSaleIdFromScopedUrl(m.url);
  if (!saleId || saleId > 0) return false;
  return !saleIdMap.has(saleId);
}

async function evaluateShiftClose(
  m: QueuedMutation,
  idMap: Map<number, number>,
): Promise<{ allow: boolean; warn: boolean }> {
  const localShiftId = m.url.match(/^\/shifts\/(-?\d+)$/)?.[1];
  const shiftId = localShiftId ? Number(localShiftId) : null;
  if (shiftId == null) return { allow: true, warn: false };

  const shiftIds = new Set<number>([shiftId]);
  const mapped = idMap.get(shiftId);
  if (mapped != null) shiftIds.add(mapped);

  for (const currentShiftId of shiftIds) {
    const pendingSales = (await localSalesStore.getByShiftId(currentShiftId)).filter(
      (r) => r.syncStatus === 'pending',
    );
    if (pendingSales.length > 0) return { allow: false, warn: false };

    const pendingExpenses = (await localExpensesStore.getByShiftId(currentShiftId)).filter(
      (r) => r.syncStatus === 'pending',
    );
    if (pendingExpenses.length > 0) return { allow: false, warn: false };
  }

  for (const currentShiftId of shiftIds) {
    const failedSales = (await localSalesStore.getByShiftId(currentShiftId)).filter(
      (r) => r.syncStatus === 'failed',
    );
    const failedExpenses = (await localExpensesStore.getByShiftId(currentShiftId)).filter(
      (r) => r.syncStatus === 'failed',
    );
    if (failedSales.length > 0 || failedExpenses.length > 0) {
      return { allow: true, warn: true };
    }
  }

  return { allow: true, warn: false };
}

function isOtherMutation(m: QueuedMutation): boolean {
  const excluded: ((queued: QueuedMutation) => boolean)[] = [
    (queued) => isAuthMutation(queued),
    isShiftOpenMutation,
    isCategoryCreateMutation,
    isExpenseCategoryCreateMutation,
    isRoleCreateMutation,
    isStaffCreateMutation,
    isOrderCreateMutation,
    isSaleMutation,
    isSalePaymentMutation,
    isProductCreateMutation,
    isExpenseMutation,
    isRefundMutation,
    isShiftCloseMutation,
    (queued) => isSaleScopedMutation(queued),
  ];
  return !excluded.some((predicate) => predicate(m));
}

export async function syncAllMutations(reporter?: SyncProgressReporter): Promise<{ synced: number; failed: number }> {
  const pending = await mutationQueue.getPending();

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  reporter?.setTier(1, 'Foundation');

  const shiftOpens = pending.filter(isShiftOpenMutation);
  const categoryCreates = pending.filter(isCategoryCreateMutation);
  const expenseCategoryCreates = pending.filter(isExpenseCategoryCreateMutation);
  const roleCreates = pending.filter(isRoleCreateMutation);
  const staffCreates = pending.filter(isStaffCreateMutation);
  const orderCreates = pending.filter(isOrderCreateMutation);
  const saleMutations = pending.filter(isSaleMutation);
  const salePaymentMutations = pending.filter(isSalePaymentMutation);
  const productCreates = pending.filter(isProductCreateMutation);
  const expenseMutations = pending.filter(isExpenseMutation);
  const refundMutations = pending.filter(isRefundMutation);
  const shiftCloses = pending.filter(isShiftCloseMutation);
  const otherMutations = pending.filter(isOtherMutation);

  let synced = 0;
  let failed = 0;

  const { synced: shiftSynced, failed: shiftFailed, idMap } = await processShiftOpens(shiftOpens);
  synced += shiftSynced;
  failed += shiftFailed;
  reporter?.addProgress(shiftSynced, shiftFailed);

  const { synced: catSynced, failed: catFailed, idMap: catIdMap } = await processCategoryCreates(categoryCreates);
  synced += catSynced;
  failed += catFailed;
  reporter?.addProgress(catSynced, catFailed);

  const {
    synced: expCatSynced,
    failed: expCatFailed,
    idMap: expCatIdMap,
  } = await processExpenseCategoryCreates(expenseCategoryCreates);
  synced += expCatSynced;
  failed += expCatFailed;
  reporter?.addProgress(expCatSynced, expCatFailed);

  const { synced: roleSynced, failed: roleFailed, idMap: roleIdMap } = await processRoleCreates(roleCreates);
  synced += roleSynced;
  failed += roleFailed;
  reporter?.addProgress(roleSynced, roleFailed);

  for (const m of staffCreates) {
    const payload = { ...(m.data as Record<string, unknown>) };
    const roleId = payload.role_id;
    if (typeof roleId === 'number' && roleId < 0 && roleIdMap.has(roleId)) {
      payload.role_id = roleIdMap.get(roleId)!;
    } else if (typeof roleId === 'number' && roleId < 0) {
      console.warn('[SyncEngine] Staff create waiting for role sync before posting user:', {
        mutationId: m.id,
        roleId,
      });
      continue;
    }
    const remapped = { ...m, data: payload };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  reporter?.setTier(2, 'Orders');

  const { synced: orderSynced, failed: orderFailed, idMap: orderIdMap } = await processOrderCreates(orderCreates);
  synced += orderSynced;
  failed += orderFailed;
  reporter?.addProgress(orderSynced, orderFailed);

  reporter?.setTier(2, 'Transactions');

  const saleIdMap = new Map<number, number>();
  const salesResult = await processSalesInChunks(saleMutations, idMap, saleIdMap, reporter, orderIdMap);
  synced += salesResult.synced;
  failed += salesResult.failed;

  reporter?.setTier(2, 'Products & expenses');

  for (const m of productCreates) {
    const payload = { ...(m.data as Record<string, unknown>) };
    const catId = payload.category_id;
    if (typeof catId === 'number' && catId < 0 && catIdMap.has(catId)) {
      payload.category_id = catIdMap.get(catId)!;
    }
    const remapped = { ...m, data: payload };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  const expenseResult = await processExpenseMutations(expenseMutations, idMap, expCatIdMap);
  synced += expenseResult.synced;
  failed += expenseResult.failed;
  reporter?.addProgress(expenseResult.synced, expenseResult.failed);

  reporter?.setTier(2, 'Sale payments');

  for (const m of salePaymentMutations) {
    if (await isSaleScopedMutationBlocked(m)) continue;
    if (needsSaleIdRemap(m, saleIdMap)) {
      console.warn('[SyncEngine] Sale payment waiting for sale id remap:', {
        mutationId: m.id,
        saleId: getSaleIdFromScopedUrl(m.url),
      });
      continue;
    }
    const remapped = { ...m, url: remapSaleScopedUrl(m.url, saleIdMap) };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  for (const m of refundMutations) {
    if (await isSaleScopedMutationBlocked(m)) continue;
    if (needsSaleIdRemap(m, saleIdMap)) {
      console.warn('[SyncEngine] Sale refund waiting for sale id remap:', {
        mutationId: m.id,
        saleId: getSaleIdFromScopedUrl(m.url),
      });
      continue;
    }
    const remapped = { ...m, url: remapSaleScopedUrl(m.url, saleIdMap) };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  reporter?.setTier(3, 'Shift closures');

  for (const m of shiftCloses) {
    const closeCheck = await evaluateShiftClose(m, idMap);
    if (!closeCheck.allow) continue;
    if (closeCheck.warn) reporter?.recordShiftCloseWarning();

    const remapped = { ...m, url: remapShiftCloseUrl(m.url, idMap) };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  reporter?.setTier(3, 'Other updates');

  for (const m of otherMutations) {
    const remapped = { ...m, url: remapOrderScopedUrl(m.url, orderIdMap) };
    const orderIdMatch = remapped.url.match(/^\/orders\/(-?\d+)(?:\/cancel)?$/);
    if (orderIdMatch) {
      const oid = Number(orderIdMatch[1]);
      if (oid < 0 && !orderIdMap.has(oid)) {
        console.warn('[SyncEngine] Order mutation waiting for create remap:', {
          mutationId: m.id,
          url: remapped.url,
        });
        continue;
      }
    }
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  return { synced, failed };
}

export interface SyncPipelineResult {
  synced: number;
  failed: number;
  stockSynced: number;
}

export async function runSyncPipeline(reporter?: SyncProgressReporter): Promise<SyncPipelineResult> {
  const { synced, failed } = await syncAllMutations(reporter);
  reporter?.setTier(4, 'Stock');
  const stockSynced = await processStockAdjustments();
  if (stockSynced > 0) reporter?.addProgress(stockSynced, 0);
  return { synced, failed, stockSynced };
}

export { AuthSyncPauseError };