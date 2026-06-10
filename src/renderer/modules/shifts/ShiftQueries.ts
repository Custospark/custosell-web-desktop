import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { store } from '../../app/store/store';
import { updateShiftContext } from '../../app/store/slices/authSlice';
import { persistAuthSnapshot } from '../../app/store/offline/auth/persistAuthSnapshot';
import { useToast } from '../../app/contexts/useToast';
import { localSalesStore, toSaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';
import { localRefundsStore, mergePendingRefunds } from '../../app/store/offline/sales/localRefundsStore';
import {
  localShiftsStore,
  toShiftWithSyncMeta,
  type ShiftRecord,
  type ShiftWithSyncMeta,
} from '../../app/store/offline/sales/localShiftsStore';
import {
  completeOfflineClockIn,
  completeOfflineClockOutInstant,
  finalizeShiftClose,
  shouldUseLocalShiftActions,
} from '../../app/store/offline/sales/completeOfflineShift';
import { isOptimisticSale } from '../../app/store/offline/sync/offlineCacheReconcile';
import { resolveAuthBusinessId } from '../../app/store/offline/catalogs/catalogSnapshotUtils';
import {
  backupShiftSalesSnapshot,
  loadShiftSalesBaseline,
} from '../../app/store/offline/catalogs/salesCatalogSnapshot';
import {
  backupShiftExpensesSnapshot,
  loadShiftExpensesBaseline,
} from '../../app/store/offline/catalogs/expensesCatalogSnapshot';
import { isCompletelyOffline, isNetworkFailure, sanitizeErrorMessage, shouldUseClientStorage } from '../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../app/store/offline/core/offlineReadStrategy';
import {
  localExpensesStore,
  toExpenseWithSyncMeta,
} from '../../app/store/offline/expenses/localExpensesStore';
import type { ExpenseWithSyncMeta } from '../expenses/api/ExpenseTypes';
import type { Sale } from '../sales/api/salesTypes';
import type { SaleWithSyncMeta } from '../../app/store/offline/sales/localSalesStore';

export interface Shift extends ShiftRecord {
  user?: { data: { id: number; name: string } };
}

function extractShiftPayload(body: unknown): Shift | null {
  if (!body || typeof body !== 'object') return null;
  const wrapped = body as { data?: Shift };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) {
    return wrapped.data;
  }
  const direct = body as Shift;
  if ('id' in direct && 'clock_in' in direct) return direct;
  return null;
}

function extractShiftListPayload(body: unknown): Shift[] {
  if (!body || typeof body !== 'object') return [];
  const wrapped = body as { data?: Shift[] };
  if (Array.isArray(wrapped.data)) return wrapped.data.filter(Boolean);
  if (Array.isArray(body)) return (body as Shift[]).filter(Boolean);
  return [];
}

async function persistActiveShiftContext(shift: Shift): Promise<ShiftWithSyncMeta> {
  store.dispatch(
    updateShiftContext({ shift_id: shift.id, shift_clock_in: shift.clock_in }),
  );
  await persistAuthSnapshot().catch(() => undefined);
  return shift as ShiftWithSyncMeta;
}

function mergeShiftSales(server: Sale[], shiftId: number): Promise<SaleWithSyncMeta[]> {
  return localSalesStore.getByShiftId(shiftId).then(async (local) => {
    const localSales = local.map(toSaleWithSyncMeta);
    const localReceipts = new Set(localSales.map((s) => s.receipt_number));
    const filtered = server.filter(
      (s) => !localReceipts.has(s.receipt_number) && !isOptimisticSale(s as SaleWithSyncMeta),
    );
    const merged = [...localSales, ...filtered] as SaleWithSyncMeta[];
    merged.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    const pendingRefunds = await localRefundsStore.getPending();
    return mergePendingRefunds(merged, pendingRefunds);
  });
}

function buildShiftFromAuth(): ShiftWithSyncMeta | null {
  const authUser = store.getState().auth.user;
  if (!authUser?.shift_id || !authUser.shift_clock_in) return null;

  const now = authUser.shift_clock_in;
  return {
    id: authUser.shift_id,
    business_id: authUser.business_id ?? 0,
    user_id: authUser.id,
    clock_in: authUser.shift_clock_in,
    clock_out: null,
    total_sales: '0',
    total_cash: '0',
    total_mobile_money: '0',
    total_card: '0',
    status: 'active',
    notes: null,
    created_at: now,
    updated_at: now,
    _pendingSync: authUser.shift_id < 0,
  };
}

async function readActiveShiftFromClient(): Promise<Shift | null> {
  const cached = queryClient.getQueryData<Shift | null>(shiftKeys.active());
  if (cached?.status === 'active') return cached;

  const local = await localShiftsStore.getActivePending();
  if (local) return toShiftWithSyncMeta(local);

  return buildShiftFromAuth();
}

export const shiftKeys = {
  all: ['shifts'] as const,
  active: () => [...shiftKeys.all, 'active'] as const,
  list: () => [...shiftKeys.all, 'list'] as const,
  expenses: (shiftId: number) => [...shiftKeys.all, 'expenses', shiftId] as const,
};

function mergeShiftExpenseLists(
  base: ExpenseWithSyncMeta[] = [],
  local: ExpenseWithSyncMeta[] = [],
): ExpenseWithSyncMeta[] {
  const localIds = new Set(local.map((expense) => expense.id));
  const serverRows = base.filter((expense) => {
    if (localIds.has(expense.id)) return false;
    if (expense._pendingSync || expense._localId || expense.id < 0) return false;
    return true;
  });
  return [...local, ...serverRows];
}

async function readShiftExpensesBaseline(shiftId: number): Promise<ExpenseWithSyncMeta[]> {
  const cached = queryClient.getQueryData<ExpenseWithSyncMeta[]>(shiftKeys.expenses(shiftId)) ?? [];
  const serverCached = cached.filter((e) => !e._pendingSync && !e._localId && e.id > 0);
  if (serverCached.length > 0) return serverCached;

  const businessId = resolveAuthBusinessId();
  if (!businessId) return [];

  try {
    return (await loadShiftExpensesBaseline(businessId, shiftId)) as ExpenseWithSyncMeta[];
  } catch (err) {
    console.warn('[ShiftExpenses] Failed to read shift expenses snapshot:', err);
    return [];
  }
}

async function readShiftExpenses(shiftId: number): Promise<ExpenseWithSyncMeta[]> {
  const baseline = await readShiftExpensesBaseline(shiftId);
  const local = await loadPendingShiftExpenses(shiftId);
  return mergeShiftExpenseLists(baseline, local);
}

async function loadPendingShiftExpenses(shiftId: number): Promise<ExpenseWithSyncMeta[]> {
  const localRecords = await localExpensesStore.getByShiftId(shiftId);
  return localRecords
    .filter((r) => r.mutationType !== 'delete')
    .map(toExpenseWithSyncMeta);
}

async function readShiftSalesBaseline(shiftId: number): Promise<Sale[]> {
  const businessId = resolveAuthBusinessId();

  if (!shouldUseClientStorage() && businessId) {
    try {
      return await loadShiftSalesBaseline(businessId, shiftId);
    } catch (err) {
      console.warn('[ShiftSales] Failed to read shift sales snapshot:', err);
    }
  }

  const cached = (queryClient.getQueryData<Sale[]>([...shiftKeys.all, 'sales', shiftId]) ?? [])
    .filter((s) => !isOptimisticSale(s as SaleWithSyncMeta));
  if (cached.length > 0) return cached;

  if (!businessId) return [];

  try {
    return await loadShiftSalesBaseline(businessId, shiftId);
  } catch (err) {
    console.warn('[ShiftSales] Failed to read shift sales snapshot:', err);
    return [];
  }
}

async function readShiftSales(shiftId: number): Promise<SaleWithSyncMeta[]> {
  const baseline = await readShiftSalesBaseline(shiftId);
  return mergeShiftSales(baseline, shiftId);
}

export function useActiveShift() {
  return useQuery<Shift | null>({
    queryKey: shiftKeys.active(),
    queryFn: async () => {
      return readWithOfflineStrategy({
        readFromClient: readActiveShiftFromClient,
        fetchFromServer: async () => {
          const response = await axiosInstance.get('/shifts/active');
          const server = extractShiftPayload(response.data);
          if (server?.status === 'active') return server;

          const local = await localShiftsStore.getActivePending();
          if (local) return toShiftWithSyncMeta(local);

          return buildShiftFromAuth();
        },
      });
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
    networkMode: 'offlineFirst',
  });
}

async function mergeShiftList(server: Shift[]): Promise<Shift[]> {
  const pendingShifts = await localShiftsStore.getPending();
  const pendingIds = new Set(pendingShifts.map((r) => r.shiftId));
  const pendingCompleted = await localShiftsStore.getPendingCompleted();
  const serverIds = new Set(server.map((s) => s.id));
  const localOnly = pendingCompleted.filter((s) => !serverIds.has(s.id));
  const filteredServer = server.filter((s): s is Shift => Boolean(s)).filter((s) => {
    const meta = s as ShiftWithSyncMeta;
    if (meta._pendingSync && !pendingIds.has(s.id)) return false;
    return true;
  });
  const merged = [...localOnly, ...filteredServer] as Shift[];
  merged.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  return merged;
}

export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: shiftKeys.list(),
    queryFn: async () => {
      return readWithOfflineStrategy({
        readFromClient: async () => {
          const cached = queryClient.getQueryData<Shift[]>(shiftKeys.list()) ?? [];
          return mergeShiftList(cached);
        },
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get('/shifts');
          return mergeShiftList(extractShiftListPayload(data));
        },
      });
    },
    staleTime: 0,
    refetchOnMount: true,
    networkMode: 'offlineFirst',
  });
}

export function useShiftSales(shiftId: number | null) {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: [...shiftKeys.all, 'sales', shiftId] as const,
    queryFn: async () => {
      if (!shiftId) return [];

      const readClient = () => readShiftSales(shiftId);

      if (shouldUseClientStorage() || isCompletelyOffline() || shiftId < 0) {
        return readClient();
      }

      return readWithOfflineStrategy({
        readFromClient: readClient,
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/by-shift/${shiftId}`, {
            timeout: 10000,
          });
          const serverSales = data.data ?? [];
          const businessId = resolveAuthBusinessId();
          if (businessId) backupShiftSalesSnapshot(businessId, shiftId, serverSales);
          return mergeShiftSales(serverSales, shiftId);
        },
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!shiftId,
    placeholderData: (prev) => prev ?? [],
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'offlineFirst',
  });
}

/** Shift-scoped expenses — local-first; tolerates missing expenses.view permission. */
export function useShiftExpenses(shiftId: number | null) {
  return useQuery<ExpenseWithSyncMeta[]>({
    queryKey: shiftId ? shiftKeys.expenses(shiftId) : [...shiftKeys.all, 'expenses', 'none'] as const,
    queryFn: async () => {
      if (!shiftId) return [];

      const readClient = () => readShiftExpenses(shiftId);

      if (shouldUseClientStorage() || isCompletelyOffline() || shiftId < 0) {
        return readClient();
      }

      return readWithOfflineStrategy({
        readFromClient: readClient,
        fetchFromServer: async () => {
          try {
            const { data } = await axiosInstance.get<{ data: ExpenseWithSyncMeta[] }>(
              `/expenses?shift_id=${shiftId}`,
              { timeout: 10000 },
            );
            const fromServer = (data.data ?? []).filter((e) => e.shift_id === shiftId);
            const businessId = resolveAuthBusinessId();
            if (businessId) {
              backupShiftExpensesSnapshot(businessId, shiftId, fromServer);
            }
            const local = await loadPendingShiftExpenses(shiftId);
            return mergeShiftExpenseLists(fromServer, local);
          } catch (err: unknown) {
            const status = (err as AxiosError).response?.status;
            if (isNetworkFailure(err) || status === 403 || status === 404) {
              return readClient();
            }
            throw err;
          }
        },
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!shiftId,
    placeholderData: (prev) => prev ?? [],
    retry: false,
    networkMode: 'offlineFirst',
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError>({
    networkMode: 'always',
    retry: false,
    mutationFn: async () => {
      if (shouldUseLocalShiftActions()) {
        return completeOfflineClockIn();
      }

      try {
        const { data } = await axiosInstance.post(
          '/shifts',
          { clock_in: new Date().toISOString(), status: 'active' },
          { timeout: 4000, skipAuthRedirect: true },
        );
        const shift = extractShiftPayload(data);
        if (!shift) {
          throw new Error('Invalid shift response from server');
        }
        return persistActiveShiftContext(shift);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineClockIn();
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      if (!shift) return;
      qc.setQueryData(shiftKeys.active(), shift);
      if (shift._pendingSync) {
        showToast('success', 'Shift started locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Shift started');
      }
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Failed to start shift'));
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError, { id: number; totals: Record<string, number> }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, totals }) => {
      const currentShift = qc.getQueryData<Shift | null>(shiftKeys.active());

      if (shouldUseLocalShiftActions()) {
        return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
      }

      try {
        const { data } = await axiosInstance.put(
          `/shifts/${id}`,
          {
            clock_out: new Date().toISOString(),
            status: 'completed',
            total_sales: totals.total_sales,
            total_cash: totals.cash,
            total_mobile_money: totals.mobile_money,
            total_card: totals.card,
          },
          { timeout: 4000 },
        );
        await finalizeShiftClose(id);
        const shift = extractShiftPayload(data);
        if (!shift) {
          throw new Error('Invalid shift response from server');
        }
        return shift as ShiftWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      if (!shift) return;
      qc.setQueryData(shiftKeys.active(), null);
      qc.setQueryData<Shift[]>(shiftKeys.list(), (old) => [shift as Shift, ...(old ?? [])]);
      if (shift._pendingSync) {
        showToast('success', 'Shift ended locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Shift ended');
      }
    },
    onError: () => showToast('error', 'Failed to end shift'),
  });
}
