import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { localSalesStore, toSaleWithSyncMeta, type SaleWithSyncMeta } from '../../../app/store/offline/sales/localSalesStore';
import { resolveAuthBusinessId } from '../../../app/store/offline/catalogs/catalogSnapshotUtils';
import {
  backupDailySalesSnapshot,
  backupSalesListSnapshot,
  loadDailySalesBaseline,
  loadSalesListBaseline,
} from '../../../app/store/offline/catalogs/salesCatalogSnapshot';
import { isNetworkFailure, sanitizeErrorMessage, shouldUseClientStorage } from '../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../app/store/offline/core/offlineReadStrategy';
import {
  completeOfflineSaleInstant,
  shouldCompleteSaleLocally,
} from '../../../app/store/offline/sales/completeOfflineSale';
import {
  canRefundSaleOffline,
  completeOfflineRefundInstant,
  shouldCompleteRefundLocally,
} from '../../../app/store/offline/sales/completeOfflineRefund';
import { localRefundsStore, mergePendingRefunds } from '../../../app/store/offline/sales/localRefundsStore';
import {
  isOptimisticSale,
  reconcileSaleList,
} from '../../../app/store/offline/sync/offlineCacheReconcile';
import { inventoryKeys } from '../../inventory/api/products/ProductQueries';
import { dashboardKeys } from '../../dashboard/DashboardQueries';
import { orderKeys } from './orders/orderQueryKeys';
import { shiftKeys } from '../../shifts/ShiftQueries';
import type { Product } from '../../inventory/api/products/ProductTypes';
import { tracksStock } from '../../inventory/api/products/ProductTypes';
import type { Sale, CreateSalePayload, RefundData } from './salesTypes';

export const salesKeys = {
  all: ['sales'] as const,
  list: () => [...salesKeys.all, 'list'] as const,
  daily: (date?: string) => [...salesKeys.all, 'daily', date] as const,
  detail: (id: number) => [...salesKeys.all, 'detail', id] as const,
};

function normalizeSalesList(payload: unknown): Sale[] {
  if (Array.isArray(payload)) return payload as Sale[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: Sale[] }).data)) {
    return (payload as { data: Sale[] }).data;
  }
  return [];
}

function mergeSalesLists(base: Sale[], local: SaleWithSyncMeta[]): SaleWithSyncMeta[] {
  const localReceipts = new Set(local.map((s) => s.receipt_number));
  const localIds = new Set(local.map((s) => s.id));
  const pendingRefundIds = new Set<number>();

  const filtered = base.filter((s) => {
    const meta = s as SaleWithSyncMeta;
    if (localReceipts.has(s.receipt_number) || localIds.has(s.id)) return false;
    if (isOptimisticSale(meta)) return false;
    return true;
  });

  const merged = reconcileSaleList(
    [...local, ...filtered] as SaleWithSyncMeta[],
    localIds,
    localReceipts,
    pendingRefundIds,
  );
  merged.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  return merged;
}

async function loadLocalPendingSales(): Promise<SaleWithSyncMeta[]> {
  const pending = await localSalesStore.getPending();
  return pending.map(toSaleWithSyncMeta);
}

function getCachedSalesList(): Sale[] {
  return queryClient.getQueryData<Sale[]>(salesKeys.list()) ?? [];
}

async function readSalesListBaseline(): Promise<Sale[]> {
  const businessId = resolveAuthBusinessId();

  if (!shouldUseClientStorage() && businessId) {
    try {
      return await loadSalesListBaseline(businessId);
    } catch (err) {
      console.warn('[Sales] Failed to read sales list snapshot:', err);
    }
  }

  const cached = getCachedSalesList().filter((s) => !isOptimisticSale(s as SaleWithSyncMeta));
  if (cached.length > 0) return cached;

  if (!businessId) return [];

  try {
    return await loadSalesListBaseline(businessId);
  } catch (err) {
    console.warn('[Sales] Failed to read sales list snapshot:', err);
    return [];
  }
}

async function readDailySalesBaseline(targetDate: string): Promise<Sale[]> {
  const businessId = resolveAuthBusinessId();

  if (!shouldUseClientStorage() && businessId) {
    try {
      return await loadDailySalesBaseline(businessId, targetDate);
    } catch (err) {
      console.warn('[Sales] Failed to read daily sales snapshot:', err);
    }
  }

  const cached = (queryClient.getQueryData<Sale[]>(salesKeys.daily(targetDate)) ?? [])
    .filter((s) => !isOptimisticSale(s as SaleWithSyncMeta));
  if (cached.length > 0) return cached;

  if (!businessId) return [];

  try {
    return await loadDailySalesBaseline(businessId, targetDate);
  } catch (err) {
    console.warn('[Sales] Failed to read daily sales snapshot:', err);
    return [];
  }
}

async function applyPendingRefundOverlay(sales: SaleWithSyncMeta[]): Promise<SaleWithSyncMeta[]> {
  const pendingRefunds = await localRefundsStore.getPending();
  return mergePendingRefunds(sales, pendingRefunds);
}

async function readSalesFromClient(): Promise<SaleWithSyncMeta[]> {
  const local = await loadLocalPendingSales();
  const baseline = await readSalesListBaseline();
  return applyPendingRefundOverlay(mergeSalesLists(baseline, local));
}

async function fetchSalesMerged(): Promise<SaleWithSyncMeta[]> {
  try {
    return await readWithOfflineStrategy({
      readFromClient: readSalesFromClient,
      fetchFromServer: async () => {
        const local = await loadLocalPendingSales();
        const { data } = await axiosInstance.get('/sales');
        const serverSales = normalizeSalesList(data);
        const businessId = resolveAuthBusinessId();
        if (businessId) backupSalesListSnapshot(businessId, serverSales);
        return applyPendingRefundOverlay(mergeSalesLists(serverSales, local));
      },
    });
  } catch (err) {
    console.warn('[Sales] Read failed — falling back to cached sales:', err);
    return readSalesFromClient();
  }
}

interface CustomerListItem {
  id: number;
  name: string;
  phone: string;
}

function normalizeCustomersResponse(payload: unknown): CustomerListItem[] {
  if (Array.isArray(payload)) return payload as CustomerListItem[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: CustomerListItem[] }).data)) {
    return (payload as { data: CustomerListItem[] }).data;
  }
  return [];
}

async function readCustomersFromCache(): Promise<CustomerListItem[]> {
  return queryClient.getQueryData<CustomerListItem[]>(['customers']) ?? [];
}

async function fetchCustomers(): Promise<CustomerListItem[]> {
  try {
    return await readWithOfflineStrategy({
      readFromClient: readCustomersFromCache,
      fetchFromServer: async () => {
        const { data } = await axiosInstance.get('/customers');
        return normalizeCustomersResponse(data);
      },
    });
  } catch (err) {
    console.warn('[Customers] Read failed — falling back to cached customers:', err);
    return readCustomersFromCache();
  }
}

const salesQueryDefaults = {
  networkMode: 'always' as const,
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  retry: (failureCount: number, error: unknown) =>
    !isNetworkFailure(error) && failureCount < 1,
};

export function useCustomers() {
  return useQuery<CustomerListItem[]>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    placeholderData: (prev) => prev ?? [],
    ...salesQueryDefaults,
  });
}

export function useSales() {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: salesKeys.list(),
    queryFn: fetchSalesMerged,
    placeholderData: (prev) => prev,
    ...salesQueryDefaults,
  });
}

export function useDailySales(date?: string) {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: salesKeys.daily(date),
    queryFn: async () => {
      const targetDate = date ?? new Date().toISOString().slice(0, 10);

      return readWithOfflineStrategy({
        readFromClient: async () => {
          const local = await loadLocalPendingSales();
          const localForDay = local.filter((s) => s.sale_date.slice(0, 10) === targetDate);
          const baseline = await readDailySalesBaseline(targetDate);
          return mergeSalesLists(baseline, localForDay);
        },
        fetchFromServer: async () => {
          const local = await loadLocalPendingSales();
          const localForDay = local.filter((s) => s.sale_date.slice(0, 10) === targetDate);
          const params = date ? `?date=${date}` : '';
          const { data } = await axiosInstance.get(`/sales/daily${params}`);
          const serverSales = normalizeSalesList(data);
          const businessId = resolveAuthBusinessId();
          if (businessId) backupDailySalesSnapshot(businessId, targetDate, serverSales);
          return mergeSalesLists(serverSales, localForDay);
        },
      });
    },
    placeholderData: (prev) => prev,
    ...salesQueryDefaults,
  });
}

export function useSale(id: number) {
  return useQuery<Sale>({
    queryKey: salesKeys.detail(id),
    queryFn: async () => {
      if (id < 0) {
        const local = await localSalesStore.getPending();
        const match = local.find((r) => r.sale.id === id);
        if (match) return match.sale;
      }

      return readWithOfflineStrategy({
        readFromClient: async () => {
          const fromList = getCachedSalesList().find((s) => s.id === id);
          if (fromList) return fromList;

          const baseline = await readSalesListBaseline();
          const fromBaseline = baseline.find((s) => s.id === id);
          if (fromBaseline) return fromBaseline;

          throw new Error('Sale not available offline');
        },
        fetchFromServer: async () => {
          const { data } = await axiosInstance.get(`/sales/${id}`);
          if (data && typeof data === 'object' && 'data' in (data as object)) {
            return (data as { data: Sale }).data;
          }
          return data as Sale;
        },
      });
    },
    enabled: Boolean(id),
    ...salesQueryDefaults,
  });
}

function isLocalPendingSale(sale: Sale | SaleWithSyncMeta): boolean {
  const meta = sale as SaleWithSyncMeta;
  return Boolean(
    meta._pendingSync
    || meta._localId
    || sale.id < 0
    || sale.receipt_number.startsWith('OFF-'),
  );
}

function applySaleOptimisticUpdates(
  qc: ReturnType<typeof useQueryClient>,
  sale: Sale,
  payload: CreateSalePayload,
): void {
  const row: SaleWithSyncMeta = isLocalPendingSale(sale)
    ? { ...sale, _pendingSync: true }
    : { ...sale };

  qc.setQueryData<SaleWithSyncMeta[]>(salesKeys.list(), (old) => {
    const list = old ?? [];
    const exists = list.some(
      (s) => s.id === sale.id || s.receipt_number === sale.receipt_number,
    );
    if (exists) return list;
    return [row, ...list];
  });

  if (payload.shift_id) {
    qc.setQueryData<SaleWithSyncMeta[]>([...shiftKeys.all, 'sales', payload.shift_id], (old) => {
      const list = old ?? [];
      if (list.some((s) => s.id === sale.id)) return list;
      return [row, ...list];
    });
  }

  qc.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
    (old ?? []).map((p) => {
      const item = payload.items.find((i) => i.product_id === p.id);
      if (!item || !tracksStock(p)) return p;
      return { ...p, stock_quantity: Math.max(0, p.stock_quantity - item.quantity) };
    }),
  );

  void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
}

function applyRefundOptimisticUpdates(
  qc: ReturnType<typeof useQueryClient>,
  updatedSale: SaleWithSyncMeta,
  refundData: RefundData,
  originalSale: Sale,
): void {
  qc.setQueryData<SaleWithSyncMeta[]>(salesKeys.list(), (old) =>
    (old ?? []).map((s) => (s.id === updatedSale.id ? updatedSale : s)),
  );

  if (originalSale.shift_id) {
    qc.setQueryData<Sale[]>([...shiftKeys.all, 'sales', originalSale.shift_id], (old) =>
      (old ?? []).map((s) => (s.id === updatedSale.id ? updatedSale : s)),
    );
  }

  qc.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
    (old ?? []).map((p) => {
      if (!tracksStock(p)) return p;
      const refundItem = refundData.items.find((item) => {
        const saleItem = originalSale.sale_items?.find((si) => si.id === item.id);
        return saleItem?.product_id === p.id;
      });
      if (!refundItem) return p;
      return { ...p, stock_quantity: p.stock_quantity + refundItem.quantity };
    }),
  );

  void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
}

export function useCreateSale() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<SaleWithSyncMeta, AxiosError, CreateSalePayload>({
    networkMode: 'always',
    mutationFn: async (payload) => {
      if (shouldCompleteSaleLocally()) {
        return completeOfflineSaleInstant(payload);
      }

      try {
        const res = await axiosInstance.post('/sales', payload);
        return res.data as SaleWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteSaleLocally()) {
          return completeOfflineSaleInstant(payload);
        }
        throw err;
      }
    },
    retry: false,
    onSuccess: (sale, payload) => {
      const isLocal = sale.receipt_number.startsWith('OFF-') || sale._pendingSync;

      applySaleOptimisticUpdates(qc, sale, payload);

      if (!isLocal) {
        // Cache is already updated optimistically — defer non-critical refetches so the modal opens faster.
        queueMicrotask(() => {
          void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
          void qc.invalidateQueries({ queryKey: orderKeys.all });
          if (payload.shift_id) {
            void qc.invalidateQueries({ queryKey: [...shiftKeys.all, 'sales', payload.shift_id] });
          }
        });
      } else if (payload.order_id) {
        void qc.invalidateQueries({ queryKey: orderKeys.all });
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Sale failed'));
    },
  });
}

export function useRefund() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<SaleWithSyncMeta, AxiosError, { id: number; data: RefundData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const sale =
        getCachedSalesList().find((s) => s.id === id) ??
        (await localSalesStore.getPending()).find((r) => r.sale.id === id)?.sale;

      if (!sale) throw new Error('Sale not found');

      if (!canRefundSaleOffline(sale)) {
        throw new Error('Sync this sale before refunding');
      }

      if (shouldCompleteRefundLocally()) {
        return completeOfflineRefundInstant(sale, data);
      }

      try {
        const { data: res } = await axiosInstance.post<{ data: Sale }>(
          `/sales/${id}/refund`,
          data,
        );
        return res.data as SaleWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteRefundLocally()) {
          return completeOfflineRefundInstant(sale, data);
        }
        throw err;
      }
    },
    onSuccess: (updatedSale, { data }) => {
      const original =
        getCachedSalesList().find((s) => s.id === updatedSale.id) ?? updatedSale;

      if (updatedSale._pendingRefundSync) {
        applyRefundOptimisticUpdates(qc, updatedSale, data, original);
        showToast('success', 'Refund saved locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: salesKeys.all });
        qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
        qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Refund processed');
      }
    },
    onError: (e) => {
      const message =
        e.message === 'Sync this sale before refunding'
          ? e.message
          : sanitizeErrorMessage(e, 'Refund failed');
      showToast('error', message);
    },
  });
}
