import { axiosInstance } from '../../api/axiosConfig';
import { store } from '../store';
import { setBusiness, updateShiftContext } from '../slices/authSlice';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { localSalesStore } from './localSalesStore';
import { localRefundsStore } from './localRefundsStore';
import { localShiftsStore, type ShiftRecord } from './localShiftsStore';
import { localProductsStore } from './localProductsStore';
import { localCategoriesStore } from './localCategoriesStore';
import { localCustomersStore } from './localCustomersStore';
import { localExpensesStore } from './localExpensesStore';
import { localExpenseCategoriesStore } from './localExpenseCategoriesStore';
import { localRolesStore } from './localRolesStore';
import { localStaffStore } from './localStaffStore';
import { localBusinessSettingsStore } from './localBusinessSettingsStore';
import { buildExpenseFormData } from './completeOfflineExpense';
import type { QueuedMutation } from './mutationQueue';
import type { CreateSalePayload, Sale } from '../../../modules/sales/api/salesTypes';
import type { Expense, ExpenseCategory, ExpenseFormPayload } from '../../../modules/expenses/api/ExpenseTypes';
import type { Business } from '../../../modules/settings/api/settings/BusinessTypes';
import type { Role } from '../../../modules/settings/api/settings/RoleTypes';
import type { StaffUser } from '../../../modules/settings/api/settings/StaffTypes';

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

function extractBatchSales(responseData: unknown): Sale[] {
  if (!responseData || typeof responseData !== 'object') return [];
  const data = responseData as { data?: Sale[]; sales?: Sale[] };
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.sales)) return data.sales;
  return [];
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

function extractExpense(responseData: unknown): Expense | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Expense };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Expense;
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

function extractStaff(responseData: unknown): StaffUser | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: StaffUser };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as StaffUser;
  if ('id' in direct) return direct;
  return null;
}

async function findServerStaffByEmail(email: unknown): Promise<StaffUser | null> {
  if (typeof email !== 'string' || !email.trim()) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const response = await axiosInstance.get<{ data: StaffUser[] }>('/users', { timeout: 10000 });
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

  await mutationQueue.markCompleted(m.id);
  await localStaffStore.markSyncedByMutationId(m.id, serverStaff.id, serverStaff);
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

    const response = await axiosInstance(config);

    await mutationQueue.markCompleted(m.id);

    if (isRefundMutation(m)) {
      await localRefundsStore.markSyncedByMutationId(m.id);
    }

    if (isShiftCloseMutation(m)) {
      await localShiftsStore.markSyncedByMutationId(m.id);
    }

    if (isProductMutation(m)) {
      if (m.method === 'DELETE') {
        await localProductsStore.removeByMutationId(m.id);
      } else {
        const responseData = response?.data as { data?: { id: number } } | undefined;
        const serverId = responseData?.data?.id;
        await localProductsStore.markSyncedByMutationId(m.id, serverId);
      }
    }

    if (isCategoryMutation(m)) {
      if (m.method === 'DELETE') {
        await localCategoriesStore.removeByMutationId(m.id);
      } else {
        const responseData = response?.data as { data?: { id: number } } | undefined;
        const serverId = responseData?.data?.id;
        await localCategoriesStore.markSyncedByMutationId(m.id, serverId);
      }
    }

    if (isCustomerMutation(m)) {
      if (m.method === 'DELETE') {
        await localCustomersStore.removeByMutationId(m.id);
      } else {
        const responseData = response?.data as { data?: { id: number } } | undefined;
        const serverId = responseData?.data?.id;
        await localCustomersStore.markSyncedByMutationId(m.id, serverId);
      }
    }

    if (isExpenseMutation(m)) {
      if (m.method === 'DELETE') {
        await localExpensesStore.removeByMutationId(m.id);
      } else {
        const serverExpense = extractExpense(response?.data);
        await localExpensesStore.markSyncedByMutationId(m.id, serverExpense?.id, serverExpense ?? undefined);
      }
    }

    if (isExpenseCategoryMutation(m)) {
      if (m.method === 'DELETE') {
        await localExpenseCategoriesStore.removeByMutationId(m.id);
      } else {
        const serverCategory = extractExpenseCategory(response?.data);
        await localExpenseCategoriesStore.markSyncedByMutationId(
          m.id,
          serverCategory?.id,
          serverCategory ?? undefined,
        );
      }
    }

    if (isRoleMutation(m)) {
      if (m.method === 'DELETE') {
        await localRolesStore.removeByMutationId(m.id);
      } else {
        const serverRole = extractRole(response?.data);
        await localRolesStore.markSyncedByMutationId(m.id, serverRole?.id, serverRole ?? undefined);
      }
    }

    if (isStaffMutation(m)) {
      if (m.method === 'DELETE') {
        await localStaffStore.removeByMutationId(m.id);
      } else {
        const serverStaff = extractStaff(response?.data);
        await localStaffStore.markSyncedByMutationId(m.id, serverStaff?.id, serverStaff ?? undefined);
      }
    }

    if (isBusinessSettingsMutation(m)) {
      const serverBusiness = extractBusiness(response?.data);
      const business = await localBusinessSettingsStore.markSyncedByMutationId(
        m.id,
        serverBusiness ?? undefined,
      );
      if (serverBusiness ?? business) {
        store.dispatch(setBusiness((serverBusiness ?? business)!));
      }
    }

    return true;
  } catch (error: unknown) {
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
    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/expense-categories', m.data);
      const serverCategory = extractExpenseCategory(response.data);
      await mutationQueue.markCompleted(m.id);

      const oldCategoryId = await localExpenseCategoriesStore.markSyncedByMutationId(
        m.id,
        serverCategory?.id,
        serverCategory ?? undefined,
      );

      if (oldCategoryId && serverCategory?.id && oldCategoryId !== serverCategory.id) {
        idMap.set(oldCategoryId, serverCategory.id);
        await localExpensesStore.updateCategoryIdInPending(oldCategoryId, serverCategory.id);
        await mutationQueue.remapExpenseCategoryIdInExpenses(oldCategoryId, serverCategory.id);
      }

      synced++;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Expense category sync failed';
      await mutationQueue.markFailed(m.id, message);
      await localExpenseCategoriesStore.markFailedByMutationId(m.id);
      failed++;
    }
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
    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/roles', m.data);
      const serverRole = extractRole(response.data);
      await mutationQueue.markCompleted(m.id);

      const oldRoleId = await localRolesStore.markSyncedByMutationId(
        m.id,
        serverRole?.id,
        serverRole ?? undefined,
      );

      if (oldRoleId && serverRole?.id && oldRoleId !== serverRole.id) {
        idMap.set(oldRoleId, serverRole.id);
        await localStaffStore.updateRoleIdInPending(oldRoleId, serverRole.id);
        await mutationQueue.remapRoleIdInStaff(oldRoleId, serverRole.id);
      }

      synced++;
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
    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/categories', m.data);
      const serverCategory = extractCategory(response.data);
      await mutationQueue.markCompleted(m.id);

      const oldCategoryId = await localCategoriesStore.markSyncedByMutationId(
        m.id,
        serverCategory?.id,
        serverCategory ?? undefined,
      );

      if (oldCategoryId && serverCategory?.id && oldCategoryId !== serverCategory.id) {
        idMap.set(oldCategoryId, serverCategory.id);
        await localProductsStore.updateCategoryIdInPending(oldCategoryId, serverCategory.id);
        await mutationQueue.remapCategoryIdInProducts(oldCategoryId, serverCategory.id);
      }

      synced++;
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
    try {
      await mutationQueue.markSyncing(m.id);
      const response = await axiosInstance.post('/shifts', m.data);
      const serverShift = extractShift(response.data);
      await mutationQueue.markCompleted(m.id);

      const oldShiftId = await localShiftsStore.markSyncedByMutationId(
        m.id,
        serverShift?.id,
        serverShift ?? undefined,
      );

      if (oldShiftId && serverShift?.id && oldShiftId !== serverShift.id) {
        idMap.set(oldShiftId, serverShift.id);
        await localSalesStore.updateShiftIdInPending(oldShiftId, serverShift.id);
        await mutationQueue.remapShiftId(oldShiftId, serverShift.id);

        const authUser = store.getState().auth.user;
        if (authUser?.shift_id === oldShiftId) {
          store.dispatch(
            updateShiftContext({
              shift_id: serverShift.id,
              shift_clock_in: serverShift.clock_in,
            }),
          );
        }
      }

      synced++;
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

export async function syncAllMutations(): Promise<{ synced: number; failed: number }> {
  const pending = await mutationQueue.getPending();

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

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

  const { synced: catSynced, failed: catFailed, idMap: catIdMap } = await processCategoryCreates(categoryCreates);
  synced += catSynced;
  failed += catFailed;

  const {
    synced: expCatSynced,
    failed: expCatFailed,
    idMap: expCatIdMap,
  } = await processExpenseCategoryCreates(expenseCategoryCreates);
  synced += expCatSynced;
  failed += expCatFailed;

  const { synced: roleSynced, failed: roleFailed, idMap: roleIdMap } = await processRoleCreates(roleCreates);
  synced += roleSynced;
  failed += roleFailed;

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

  if (saleMutations.length > 0) {
    try {
      const sales = saleMutations.map((m) => {
        const payload = { ...(m.data as CreateSalePayload) };
        if (payload.shift_id && idMap.has(payload.shift_id)) {
          payload.shift_id = idMap.get(payload.shift_id)!;
        }
        return payload;
      });
      const response = await axiosInstance.post('/sales/batch', { sales });
      const syncedSales = extractBatchSales(response.data);

      for (let i = 0; i < saleMutations.length; i++) {
        const m = saleMutations[i];
        const serverSale = syncedSales[i];
        await mutationQueue.markCompleted(m.id);
        await localSalesStore.markSyncedByMutationId(m.id, serverSale?.id, serverSale);
      }
      synced += saleMutations.length;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Batch sync failed';
      for (const m of saleMutations) {
        await mutationQueue.markFailed(m.id, message);
        await localSalesStore.markFailedByMutationId(m.id);
      }
      failed += saleMutations.length;
    }
  }

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

  for (const m of expenseMutations) {
    let remapped = m;
    if (m.method === 'POST' && isExpenseFormPayload(m.data)) {
      const payload: ExpenseFormPayload = {
        ...m.data,
        fields: { ...m.data.fields },
      };
      const rawCategoryId = payload.fields.expense_category_id;
      const categoryId = rawCategoryId ? Number(rawCategoryId) : null;
      if (categoryId && categoryId < 0 && expCatIdMap.has(categoryId)) {
        payload.fields.expense_category_id = String(expCatIdMap.get(categoryId)!);
      }
      remapped = { ...m, data: payload };
    }
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  for (const m of refundMutations) {
    const ok = await processMutation(m);
    if (ok) synced++;
    else failed++;
  }

  for (const m of shiftCloses) {
    const remapped = { ...m, url: remapShiftCloseUrl(m.url, idMap) };
    const ok = await processMutation(remapped);
    if (ok) synced++;
    else failed++;
  }

  for (const m of otherMutations) {
    const ok = await processMutation(m);
    if (ok) synced++;
    else failed++;
  }

  await mutationQueue.clearCompleted();
  await localSalesStore.removeSynced();
  await localRefundsStore.removeSynced();
  await localShiftsStore.removeSynced();
  await localProductsStore.removeSynced();
  await localCategoriesStore.removeSynced();
  await localCustomersStore.removeSynced();
  await localExpensesStore.removeSynced();
  await localExpenseCategoriesStore.removeSynced();
  await localRolesStore.removeSynced();
  await localStaffStore.removeSynced();
  await localBusinessSettingsStore.removeSynced();
  return { synced, failed };
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
      });
      await stockLedger.markAdjustmentSynced(adj.id);
      synced++;
    } catch {
      break;
    }
  }

  await stockLedger.clearSynced();
  return synced;
}
