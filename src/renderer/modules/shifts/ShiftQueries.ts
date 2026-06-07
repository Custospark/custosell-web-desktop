import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { store } from '../../app/store/store';
import { useToast } from '../../app/contexts/useToast';
import { localSalesStore, toSaleWithSyncMeta } from '../../app/store/offline/localSalesStore';
import { localRefundsStore, mergePendingRefunds } from '../../app/store/offline/localRefundsStore';
import {
  localShiftsStore,
  toShiftWithSyncMeta,
  type ShiftRecord,
  type ShiftWithSyncMeta,
} from '../../app/store/offline/localShiftsStore';
import {
  completeOfflineClockInInstant,
  completeOfflineClockOutInstant,
  shouldCompleteShiftLocally,
} from '../../app/store/offline/completeOfflineShift';
import { isOptimisticSale } from '../../app/store/offline/offlineCacheReconcile';
import { isNetworkFailure } from '../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../app/store/offline/offlineReadStrategy';
import type { Sale } from '../sales/api/salesTypes';
import type { SaleWithSyncMeta } from '../../app/store/offline/localSalesStore';

export interface Shift extends ShiftRecord {
  user?: { data: { id: number; name: string } };
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
};

export function useActiveShift() {
  return useQuery<Shift | null>({
    queryKey: shiftKeys.active(),
    queryFn: async () => {
      return readWithOfflineStrategy({
        readFromClient: readActiveShiftFromClient,
        fetchFromServer: async () => {
          const response = await axiosInstance.get<{ data: Shift }>('/shifts/active');
          const server = response.data?.data ?? null;
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
    networkMode: 'always',
  });
}

async function mergeShiftList(server: Shift[]): Promise<Shift[]> {
  const pendingShifts = await localShiftsStore.getPending();
  const pendingIds = new Set(pendingShifts.map((r) => r.shiftId));
  const pendingCompleted = await localShiftsStore.getPendingCompleted();
  const serverIds = new Set(server.map((s) => s.id));
  const localOnly = pendingCompleted.filter((s) => !serverIds.has(s.id));
  const filteredServer = server.filter((s) => {
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
          const { data } = await axiosInstance.get<{ data: Shift[] }>('/shifts');
          return mergeShiftList(data.data);
        },
      });
    },
    staleTime: 0,
    refetchOnMount: true,
    networkMode: 'always',
  });
}

export function useShiftSales(shiftId: number | null) {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: [...shiftKeys.all, 'sales', shiftId] as const,
    queryFn: async () => {
      if (!shiftId) return [];

      return readWithOfflineStrategy({
        readFromClient: () => {
          const cached = queryClient.getQueryData<Sale[]>([...shiftKeys.all, 'sales', shiftId]) ?? [];
          return mergeShiftSales(cached, shiftId);
        },
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/by-shift/${shiftId}`, {
            timeout: 10000,
          });
          return mergeShiftSales(data.data, shiftId);
        },
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: !!shiftId,
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError>({
    networkMode: 'always',
    retry: false,
    mutationFn: async () => {
      if (shouldCompleteShiftLocally()) {
        return completeOfflineClockInInstant();
      }

      try {
        const { data } = await axiosInstance.post<{ data: Shift }>(
          '/shifts',
          { clock_in: new Date().toISOString(), status: 'active' },
          { timeout: 4000 },
        );
        return data.data as ShiftWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineClockInInstant();
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      qc.setQueryData(shiftKeys.active(), shift);
      if (shift._pendingSync) {
        showToast('success', 'Shift started locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Shift started');
      }
    },
    onError: () => showToast('error', 'Failed to start shift'),
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

      if (shouldCompleteShiftLocally()) {
        return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
      }

      try {
        const { data } = await axiosInstance.put<{ data: Shift }>(
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
        return data.data as ShiftWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
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
