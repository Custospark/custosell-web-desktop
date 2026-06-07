import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { store } from '../../../app/store/store';
import { mutationQueue } from '../../../app/store/offline/mutationQueue';
import { stockLedger } from '../../../app/store/offline/stockLedger';
import { localSalesStore, toSaleWithSyncMeta, type SaleWithSyncMeta } from '../../../app/store/offline/localSalesStore';
import { buildStockSeedMap } from '../../../app/store/offline/offlineStockOverlay';
import { computeOfflineSalesSummary, mergeDashboardWithOffline } from '../../../app/store/offline/offlineSalesSummary';
import { generateLocalReceiptNumber } from '../../../app/store/offline/receiptGenerator';
import { inventoryKeys } from '../../inventory/api/products/ProductQueries';
import { dashboardKeys } from '../../dashboard/DashboardQueries';
import { shiftKeys } from '../../shifts/ShiftQueries';
import type { Product } from '../../inventory/api/products/ProductTypes';
import type { DashboardSummary } from '../../dashboard/DashboardTypes';
import type { Sale, CreateSalePayload, RefundData } from './salesTypes';

export const salesKeys = {
  all: ['sales'] as const,
  list: () => [...salesKeys.all, 'list'] as const,
  daily: (date?: string) => [...salesKeys.all, 'daily', date] as const,
  detail: (id: number) => [...salesKeys.all, 'detail', id] as const,
};

function isOfflineMode(): boolean {
  const state = store.getState();
  return (state as { network?: { systemStatus?: string } }).network?.systemStatus === 'offline';
}

function mergeSalesLists(base: Sale[], local: SaleWithSyncMeta[]): SaleWithSyncMeta[] {
  const localReceipts = new Set(local.map((s) => s.receipt_number));
  const filtered = base.filter((s) => !localReceipts.has(s.receipt_number));
  const merged = [...local, ...filtered];
  merged.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  return merged;
}

async function loadLocalPendingSales(): Promise<SaleWithSyncMeta[]> {
  const pending = await localSalesStore.getPending();
  return pending.map(toSaleWithSyncMeta);
}

async function fetchSalesMerged(): Promise<SaleWithSyncMeta[]> {
  const local = await loadLocalPendingSales();

  if (isOfflineMode()) {
    const cached = queryClient.getQueryData<Sale[]>(salesKeys.list()) ?? [];
    return mergeSalesLists(cached, local);
  }

  try {
    const { data } = await axiosInstance.get<{ data: Sale[] }>('/sales');
    return mergeSalesLists(data.data, local);
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) throw err;
    const cached = queryClient.getQueryData<Sale[]>(salesKeys.list()) ?? [];
    return mergeSalesLists(cached, local);
  }
}

interface CustomerListItem {
  id: number;
  name: string;
  phone: string;
}

export function useCustomers() {
  return useQuery<CustomerListItem[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: CustomerListItem[] }>('/customers');
      return data.data;
    },
  });
}

export function useSales() {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: salesKeys.list(),
    queryFn: fetchSalesMerged,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useDailySales(date?: string) {
  return useQuery<SaleWithSyncMeta[]>({
    queryKey: salesKeys.daily(date),
    queryFn: async () => {
      const local = await loadLocalPendingSales();
      const targetDate = date ?? new Date().toISOString().slice(0, 10);
      const localForDay = local.filter((s) => s.sale_date.slice(0, 10) === targetDate);

      if (isOfflineMode()) {
        const cached = queryClient.getQueryData<Sale[]>(salesKeys.daily(date)) ?? [];
        return mergeSalesLists(cached, localForDay);
      }

      try {
        const params = date ? `?date=${date}` : '';
        const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/daily${params}`);
        return mergeSalesLists(data.data, localForDay);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response) throw err;
        const cached = queryClient.getQueryData<Sale[]>(salesKeys.daily(date)) ?? [];
        return mergeSalesLists(cached, localForDay);
      }
    },
  });
}

export function useSale(id: number) {
  return useQuery<Sale>({
    queryKey: salesKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Sale }>(`/sales/${id}`);
      return data.data;
    },
    enabled: Boolean(id) && id > 0,
  });
}

async function createLocalSale(payload: CreateSalePayload): Promise<SaleWithSyncMeta> {
  const receiptNumber = generateLocalReceiptNumber();
  const now = new Date().toISOString();
  const localIdNum = -Date.now();

  const products = queryClient.getQueryData<Product[]>(inventoryKeys.products());
  const seedMap = products ? await buildStockSeedMap(products) : undefined;

  await stockLedger.batchAdjust(
    payload.items.map((item) => ({ productId: item.product_id, delta: -item.quantity })),
    'sale',
    seedMap,
  );

  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'POST',
      url: '/sales',
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineSale] Enqueue failed:', err);
  }

  const sale: Sale = {
    id: localIdNum,
    receipt_number: receiptNumber,
    total_amount: payload.total_amount.toString(),
    payment_method: payload.payment_method,
    payment_status: 'paid',
    subtotal: payload.subtotal.toString(),
    tax_total: (payload.tax_total ?? 0).toString(),
    discount_amount: (payload.discount_amount || 0).toString(),
    created_at: now,
    updated_at: now,
    business_id: 0,
    user_id: 0,
    customer_id: payload.customer_id ?? null,
    shift_id: payload.shift_id ?? null,
    amount_tendered: payload.amount_tendered ? payload.amount_tendered.toString() : null,
    change_given: payload.change_given ? payload.change_given.toString() : null,
    notes: payload.notes ?? null,
    sale_date: now,
    sale_items: payload.items.map((item, i) => ({
      id: localIdNum - i,
      sale_id: localIdNum,
      product_id: item.product_id,
      product_name: '',
      product_price: item.unit_price.toString(),
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      subtotal: (item.quantity * item.unit_price).toString(),
      tax_amount: '0',
      discount_amount: '0',
      refunded_quantity: 0,
      refunded_amount: '0',
    })),
  };

  const storedLocalId = await localSalesStore.save(sale, payload, mutationId);

  return {
    ...sale,
    _pendingSync: true,
    _localId: storedLocalId,
  };
}

function applySaleOptimisticUpdates(
  qc: ReturnType<typeof useQueryClient>,
  sale: Sale,
  payload: CreateSalePayload,
): void {
  qc.setQueryData<SaleWithSyncMeta[]>(salesKeys.list(), (old) => {
    const list = old ?? [];
    const exists = list.some(
      (s) => s.id === sale.id || s.receipt_number === sale.receipt_number,
    );
    if (exists) return list;
    return [{ ...sale, _pendingSync: true }, ...list];
  });

  if (payload.shift_id) {
    qc.setQueryData<Sale[]>([...shiftKeys.all, 'sales', payload.shift_id], (old) => {
      const list = old ?? [];
      if (list.some((s) => s.id === sale.id)) return list;
      return [sale, ...list];
    });
  }

  qc.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
    (old ?? []).map((p) => {
      const item = payload.items.find((i) => i.product_id === p.id);
      if (!item) return p;
      return { ...p, stock_quantity: Math.max(0, p.stock_quantity - item.quantity) };
    }),
  );

  void computeOfflineSalesSummary().then((offline) => {
    qc.setQueryData<DashboardSummary | undefined>(dashboardKeys.summary(), (old) => {
      if (!old) return old;
      return mergeDashboardWithOffline(old, offline);
    });
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<SaleWithSyncMeta, AxiosError, CreateSalePayload>({
    mutationFn: async (payload) => {
      const offline = isOfflineMode();

      if (offline) {
        return createLocalSale(payload);
      }

      try {
        const res = await axiosInstance.post('/sales', payload, { timeout: 5000 });
        return res.data as SaleWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return createLocalSale(payload);
        }
        throw err;
      }
    },
    onSuccess: (sale, payload) => {
      const isLocal = sale.receipt_number.startsWith('OFF-') || sale._pendingSync;

      if (isLocal) {
        applySaleOptimisticUpdates(qc, sale, payload);
      } else {
        qc.invalidateQueries({ queryKey: salesKeys.all });
        qc.invalidateQueries({ queryKey: salesKeys.list() });
        qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
        qc.invalidateQueries({ queryKey: dashboardKeys.all });
        qc.invalidateQueries({ queryKey: shiftKeys.all });
      }
    },
    onError: (e) => {
      showToast('error', (e.response?.data as { message?: string })?.message || 'Sale failed');
    },
  });
}

export function useRefund() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Sale, AxiosError, { id: number; data: RefundData }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.post<{ data: Sale }>(`/sales/${id}/refund`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
      showToast('success', 'Refund processed');
    },
    onError: (e) => {
      showToast('error', (e.response?.data as { message?: string })?.message || 'Refund failed');
    },
  });
}
