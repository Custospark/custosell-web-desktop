import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import { setBusiness, updateShiftContext } from '../../slices/authSlice';
import { businessToAuthInfo } from '../../../../modules/settings/api/settings/businessAuthSync';
import { persistAuthSnapshot } from '../auth/persistAuthSnapshot';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from '../inventory/stockLedger';
import { localSalesStore } from '../sales/localSalesStore';
import { localRefundsStore } from '../sales/localRefundsStore';
import { localShiftsStore, type ShiftRecord } from '../sales/localShiftsStore';
import { localProductsStore } from '../inventory/localProductsStore';
import { localCategoriesStore } from '../inventory/localCategoriesStore';
import { localCustomersStore } from '../customers/localCustomersStore';
import { localExpensesStore } from '../expenses/localExpensesStore';
import { localExpenseCategoriesStore } from '../expenses/localExpenseCategoriesStore';
import { localRolesStore } from '../settings/localRolesStore';
import { localStaffStore } from '../settings/localStaffStore';
import { localBusinessSettingsStore } from '../settings/localBusinessSettingsStore';
import { localGuideFeedbackStore } from '../guide/localGuideFeedbackStore';
import { buildExpenseFormData } from '../expenses/completeOfflineExpense';
import type { QueuedMutation } from './mutationQueue';
import { isAuthMutation } from '../auth/syncAuthEngine';
import { processSalesInChunks } from '../sales/syncSalesBatch';
import { processExpenseMutations } from '../expenses/syncExpenses';
import type { SyncProgressReporter } from './syncProgressReporter';
import { AuthSyncPauseError, extractErrorMessage, isAuthHttpError } from './syncErrorUtils';
import type { ExpenseCategory, ExpenseFormPayload } from '../../../../modules/expenses/api/ExpenseTypes';
import type { Business } from '../../../../modules/settings/api/settings/BusinessTypes';
import type { Role } from '../../../../modules/settings/api/settings/RoleTypes';
import type { StaffUser } from '../../../../modules/settings/api/settings/StaffTypes';
import { commitMutationQueueEntry } from './syncMutationFinalize';
import { refreshExpenseCategoriesSnapshot } from '../catalogs/expensesCatalogSnapshot';
import { invalidateAfterItemCommitted } from './syncCacheRefresh';

function getRefundSaleId(m: QueuedMutation): number | null {
  const match = m.url.match(/^\/sales\/(-?\d+)\/refund$/);
  return match ? Number(match[1]) : null;
}

async function isRefundBlocked(m: QueuedMutation): Promise<boolean> {
  const saleId = getRefundSaleId(m);
  if (!saleId || saleId > 0) return false;
  const pending = await localSalesStore.getPending();
  return pending.some((r) => r.sale.id === saleId && r.syncStatus === 'pending');
}

function extractShiftIdFromCloseUrl(url: string): number | null {
  const match = url.match(/^\/shifts\/(-?\d+)$/);
  return match ? Number(match[1]) : null;
}

async function evaluateShiftClose(
  m: QueuedMutation,
  idMap: Map<number, number>,
): Promise<{ allow: boolean; warn: boolean }> {
  const localShiftId = extractShiftIdFromCloseUrl(m.url);
  if (localShiftId == null) return { allow: true, warn: false };

  const shiftIds = new Set<number>([localShiftId]);
  const mapped = idMap.get(localShiftId);
  if (mapped != null) shiftIds.add(mapped);

  for (const shiftId of shiftIds) {
    const pendingSales = (await localSalesStore.getByShiftId(shiftId)).filter((r) => r.syncStatus === 'pending');
    if (pendingSales.length > 0) return { allow: false, warn: false };

    const pendingExpenses = (await localExpensesStore.getByShiftId(shiftId)).filter((r) => r.syncStatus === 'pending');
    if (pendingExpenses.length > 0) return { allow: false, warn: false };
  }

  for (const shiftId of shiftIds) {
    const failedSales = (await localSalesStore.getByShiftId(shiftId)).filter((r) => r.syncStatus === 'failed');
    const failedExpenses = (await localExpensesStore.getByShiftId(shiftId)).filter((r) => r.syncStatus === 'failed');
    if (failedSales.length > 0 || failedExpenses.length > 0) {
      return { allow: true, warn: true };
    }
  }

  return { allow: true, warn: false };
}

function isSaleMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/sales';
}

function isShiftOpenMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/shifts';
}

function isShiftCloseMutation(m: QueuedMutation): boolean {
  return m.method === 'PUT' && /^\/shifts\/-?\d+$/.test(m.url);
}

function isRefundMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && /^\/sales\/-?\d+\/refund$/.test(m.url);
}

function isProductMutation(m: QueuedMutation): boolean {
  return /^\/products(\/\d+)?$/.test(m.url);
}

function isCategoryMutation(m: QueuedMutation): boolean {
  return /^\/categories(\/\d+)?$/.test(m.url);
}

function isCustomerMutation(m: QueuedMutation): boolean {
  return /^\/customers(\/\d+)?$/.test(m.url);
}

function isExpenseMutation(m: QueuedMutation): boolean {
  return /^\/expenses(\/-?\d+)?$/.test(m.url);
}

function isExpenseCategoryMutation(m: QueuedMutation): boolean {
  return /^\/expense-categories(\/-?\d+)?$/.test(m.url);
}

function isRoleMutation(m: QueuedMutation): boolean {
  return /^\/roles(\/-?\d+)?$/.test(m.url);
}

function isStaffMutation(m: QueuedMutation): boolean {
  return /^\/users(\/-?\d+)?$/.test(m.url);
}

function isBusinessSettingsMutation(m: QueuedMutation): boolean {
  return m.url === '/businesses/profile' || m.url === '/businesses/settings';
}

function isGuideFeedbackMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/guide/feedback';
}

function isCategoryCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/categories';
}

function isProductCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/products';
}

function isExpenseCategoryCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/expense-categories';
}

function isRoleCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/roles';
}

function isStaffCreateMutation(m: QueuedMutation): boolean {
  return m.method === 'POST' && m.url === '/users';
}

function isExpenseFormPayload(data: unknown): data is ExpenseFormPayload {
  return Boolean(data && typeof data === 'object' && 'fields' in data);
}

function extractCategory(responseData: unknown): { id: number } | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: { id: number } };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as { id: number };
  if ('id' in direct) return direct;
  return null;
}

function extractExpenseCategory(responseData: unknown): ExpenseCategory | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: ExpenseCategory };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as ExpenseCategory;
  if ('id' in direct) return direct;
  return null;
}

function extractRole(responseData: unknown): Role | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Role };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Role;
  if ('id' in direct) return direct;
  return null;
}

async function findServerStaffByEmail(email: unknown): Promise<StaffUser | null> {
  if (typeof email !== 'string' || !email.trim()) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const response = await axiosInstance.get<{ data: StaffUser[] }>('/users', { timeout: 10000, skipAuthRedirect: true });
  return response.data.data
    .filter(Boolean)
    .find((staff) => staff.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

async function reconcileDuplicateStaffCreate(m: QueuedMutation, message: string): Promise<boolean> {
  if (!isStaffCreateMutation(m)) return false;
  if (!/email|duplicate|already|taken/i.test(message)) return false;

  const payload = m.data as { email?: unknown } | undefined;
  let serverStaff: StaffUser | null;
  try {
    serverStaff = await findServerStaffByEmail(payload?.email);
  } catch {
    return false;
  }
  if (!serverStaff) return false;

  await commitMutationQueueEntry(m.id);
  await localStaffStore.removeByMutationId(m.id);
  void invalidateAfterItemCommitted().catch(() => undefined);
  return true;
}

async function reconcileDuplicateShiftClose(m: QueuedMutation, status?: number): Promise<boolean> {
  if (!isShiftCloseMutation(m)) return false;
  if (status !== 404) return false;

  await commitMutationQueueEntry(m.id);
  await localShiftsStore.removeByMutationId(m.id);
  const closedShiftId = extractShiftIdFromCloseUrl(m.url);
  if (closedShiftId) {
    store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
    void persistAuthSnapshot().catch(() => undefined);
  }
  void invalidateAfterItemCommitted().catch(() => undefined);
  return true;
}

function extractBusiness(responseData: unknown): Business | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Business };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Business;
  if ('id' in direct) return direct;
  return null;
}

function extractShift(responseData: unknown): ShiftRecord | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: ShiftRecord };
  if (wrapped.data && typeof wrapped.data === 'object') return wrapped.data;
  return responseData as ShiftRecord;
}

export async function processMutation(m: QueuedMutation): Promise<boolean> {
  const queued = await mutationQueue.getById(m.id);
  if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) {
    return true;
  }

  try {
    await mutationQueue.markSyncing(m.id);

    const config: {
      method: QueuedMutation['method'];
      url: string;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      method: m.method,
      url: m.url,
      data: m.data,
      headers: m.headers,
    };

    if (isExpenseMutation(m) && m.method === 'POST' && isExpenseFormPayload(m.data)) {
      config.data = buildExpenseFormData(m.data, m.url === '/expenses' ? undefined : { methodOverride: 'PUT' });
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    const response = await axiosInstance({ ...config, skipAuthRedirect: true } as never);

    await commitMutationQueueEntry(m.id);

    if (isRefundMutation(m)) {
      await localRefundsStore.removeByMutationId(m.id);
    }

    if (isShiftCloseMutation(m)) {
      await localShiftsStore.removeByMutationId(m.id);
      const closedShiftId = extractShiftIdFromCloseUrl(m.url);
      if (closedShiftId) {
        store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
        void persistAuthSnapshot().catch(() => undefined);
      }
    }

    if (isProductMutation(m)) {
      await localProductsStore.removeByMutationId(m.id);
    }

    if (isCategoryMutation(m)) {
      await localCategoriesStore.removeByMutationId(m.id);
    }

    if (isCustomerMutation(m)) {
      await localCustomersStore.removeByMutationId(m.id);
    }

    if (isExpenseMutation(m)) {
      await localExpensesStore.removeByMutationId(m.id);
    }

    if (isExpenseCategoryMutation(m)) {
      await localExpenseCategoriesStore.removeByMutationId(m.id);
      void refreshExpenseCategoriesSnapshot().catch(() => undefined);
    }

    if (isRoleMutation(m)) {
      await localRolesStore.removeByMutationId(m.id);
    }

    if (isStaffMutation(m)) {
      await localStaffStore.removeByMutationId(m.id);
    }

    if (isBusinessSettingsMutation(m)) {
      const serverBusiness = extractBusiness(response?.data);
      if (serverBusiness) {
        store.dispatch(setBusiness(businessToAuthInfo(serverBusiness)));
      }
      await localBusinessSettingsStore.removeByMutationId(m.id);
    }

    if (isGuideFeedbackMutation(m)) {
      await localGuideFeedbackStore.removeByMutationId(m.id);
    }

    void invalidateAfterItemCommitted().catch(() => undefined);
    return true;
  } catch (error: unknown) {
    if (isAuthHttpError(error)) {
      throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
    }

    const err = error as {
      response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
      message?: string;
    };
    const isServerError = err?.response?.status && err.response.status >= 400 && err.response.status < 500;
    const validationMessage = err?.response?.data?.errors
      ? Object.values(err.response.data.errors).flat().join(' ')
      : undefined;
    const message = validationMessage || err?.response?.data?.message || err?.message || 'Request failed';

    if (await reconcileDuplicateStaffCreate(m, message)) {
      return true;
    }

    if (await reconcileDuplicateShiftClose(m, err?.response?.status)) {
      return true;
    }

    if (isRefundMutation(m)) {
      await localRefundsStore.markFailedByMutationId(m.id);
    }
    if (isShiftCloseMutation(m)) {
      await localShiftsStore.markFailedByMutationId(m.id);
    }
    if (isShiftOpenMutation(m)) {
      await localShiftsStore.markFailedByMutationId(m.id);
    }

    if (isProductMutation(m)) {
      await localProductsStore.markFailedByMutationId(m.id, message);
    }

    if (isCategoryMutation(m)) {
      await localCategoriesStore.markFailedByMutationId(m.id);
    }

    if (isCustomerMutation(m)) {
      await localCustomersStore.markFailedByMutationId(m.id);
    }

    if (isExpenseMutation(m)) {
      await localExpensesStore.markFailedByMutationId(m.id);
    }

    if (isExpenseCategoryMutation(m)) {
      await localExpenseCategoriesStore.markFailedByMutationId(m.id);
    }

    if (isRoleMutation(m)) {
      await localRolesStore.markFailedByMutationId(m.id, message);
    }

    if (isStaffMutation(m)) {
      await localStaffStore.markFailedByMutationId(m.id, message);
    }

    if (isBusinessSettingsMutation(m)) {
      await localBusinessSettingsStore.markFailedByMutationId(m.id);
    }

    if (isGuideFeedbackMutation(m)) {
      await localGuideFeedbackStore.markFailedByMutationId(m.id, message);
    }

    if (isServerError && m.retryCount >= m.maxRetries) {
      await mutationQueue.markFailed(m.id, message);
    } else if (isServerError) {
      await mutationQueue.markFailed(m.id, message);
    } else {
      await mutationQueue.markFailed(m.id, message);
    }
    return false;
  }
}

async function processExpenseCategoryCreates(
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
    void refreshExpenseCategoriesSnapshot().catch(() => undefined);
  }

  return { synced, failed, idMap };
}

async function processRoleCreates(
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

async function processCategoryCreates(
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

async function processShiftOpens(
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

function remapShiftCloseUrl(url: string, idMap: Map<number, number>): string {
  const match = url.match(/^\/shifts\/(-?\d+)$/);
  if (!match) return url;
  const localId = Number(match[1]);
  const serverId = idMap.get(localId) ?? localId;
  return `/shifts/${serverId}`;
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
  const saleMutations = pending.filter(isSaleMutation);
  const productCreates = pending.filter(isProductCreateMutation);
  const expenseMutations = pending.filter(isExpenseMutation);
  const refundMutations = pending.filter(isRefundMutation);
  const shiftCloses = pending.filter(isShiftCloseMutation);
  const otherMutations = pending.filter(
    (m) =>
      !isAuthMutation(m) &&
      !isShiftOpenMutation(m) &&
      !isCategoryCreateMutation(m) &&
      !isExpenseCategoryCreateMutation(m) &&
      !isRoleCreateMutation(m) &&
      !isStaffCreateMutation(m) &&
      !isSaleMutation(m) &&
      !isProductCreateMutation(m) &&
      !isExpenseMutation(m) &&
      !isRefundMutation(m) &&
      !isShiftCloseMutation(m),
  );

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

  reporter?.setTier(2, 'Transactions');

  const salesResult = await processSalesInChunks(saleMutations, idMap, reporter);
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

  for (const m of refundMutations) {
    if (await isRefundBlocked(m)) continue;
    const ok = await processMutation(m);
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
    const ok = await processMutation(m);
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

export async function processStockAdjustments(): Promise<number> {
  const adjustments = (await stockLedger.getPendingAdjustments()).filter(
    (adj) => adj.reason !== 'sale',
  );
  let synced = 0;

  for (const adj of adjustments) {
    try {
      await axiosInstance.post('/stock-movements', {
        product_id: adj.productId,
        quantity_change: adj.delta,
        type: adj.reason === 'refund' ? 'return' : 'adjustment',
        notes: `Offline sync: ${adj.reason}`,
      }, { skipAuthRedirect: true });
      await stockLedger.markAdjustmentSynced(adj.id);
      synced++;
      void invalidateAfterItemCommitted().catch(() => undefined);
    } catch {
      break;
    }
  }

  await stockLedger.clearSynced();
  return synced;
}
