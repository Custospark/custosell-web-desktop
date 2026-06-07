import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { store } from '../../../app/store/store';
import { mutationQueue } from '../../../app/store/offline/mutationQueue';
import { stockLedger } from '../../../app/store/offline/stockLedger';
import { generateLocalReceiptNumber } from '../../../app/store/offline/receiptGenerator';
import type { Sale, CreateSalePayload, RefundData } from './salesTypes';

export const salesKeys = {
  all: ['sales'] as const,
  list: () => [...salesKeys.all, 'list'] as const,
  daily: (date?: string) => [...salesKeys.all, 'daily', date] as const,
  detail: (id: number) => [...salesKeys.all, 'detail', id] as const,
};

export function useCustomers() {
  return useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: any[] }>('/customers');
      return data.data;
    },
  });
}

export function useSales() {
  return useQuery<Sale[]>({
    queryKey: salesKeys.list(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Sale[] }>('/sales');
      return data.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useDailySales(date?: string) {
  return useQuery<Sale[]>({
    queryKey: salesKeys.daily(date),
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/daily${params}`);
      return data.data;
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
    enabled: Boolean(id),
  });
}

async function createLocalSale(payload: CreateSalePayload): Promise<Sale> {
  console.log('[OfflineSale] Creating local sale', payload);

  const receiptNumber = generateLocalReceiptNumber();
  console.log('[OfflineSale] Generated receipt:', receiptNumber);

  for (const item of payload.items) {
    try {
      await stockLedger.adjust(item.product_id, -item.quantity, 'sale');
      console.log('[OfflineSale] Stock adjusted for product', item.product_id, 'by', -item.quantity);
    } catch (err) {
      console.error('[OfflineSale] Stock adjust failed:', err);
    }
  }

  try {
    const queueId = await mutationQueue.enqueue({
      method: 'POST',
      url: '/sales',
      data: payload,
      maxRetries: 3,
    });
    console.log('[OfflineSale] Enqueued mutation:', queueId);
  } catch (err) {
    console.error('[OfflineSale] Enqueue failed:', err);
  }

  console.log('[OfflineSale] Returning local sale object');
  return {
    id: Date.now(),
    receipt_number: receiptNumber,
    total_amount: payload.total_amount.toString(),
    payment_method: payload.payment_method as any,
    payment_status: 'paid' as const,
    subtotal: payload.subtotal.toString(),
    discount_amount: (payload.discount_amount || 0).toString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business_id: 0,
    user_id: 0,
    customer_id: payload.customer_id ?? null,
    shift_id: null,
    amount_tendered: payload.amount_tendered ? payload.amount_tendered.toString() : null,
    change_given: payload.change_given ? payload.change_given.toString() : null,
    notes: null,
    sale_date: new Date().toISOString(),
    sale_items: payload.items.map((item, i) => ({
      id: Date.now() + i,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(),
      subtotal: (item.quantity * item.unit_price).toString(),
    } as any)),
  } as Sale;
}

export function useCreateSale() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Sale, AxiosError, CreateSalePayload>({
    mutationFn: async (payload) => {
      const state = store.getState();
      const systemStatus = (state as any).network?.systemStatus;
      const isOffline = systemStatus === 'offline';
      console.log('[useCreateSale] systemStatus:', systemStatus, 'isOffline:', isOffline);

      if (isOffline) {
        console.log('[useCreateSale] OFFLINE — queuing locally');
        return createLocalSale(payload);
      }

      try {
        console.log('[useCreateSale] ONLINE — posting to server');
        const res = await axiosInstance.post('/sales', payload, { timeout: 5000 });
        console.log('[useCreateSale] Server response:', res.status);
        return res.data as Sale;
      } catch (err: any) {
        console.log('[useCreateSale] Network error:', err?.message, 'has response:', !!err?.response);
        if (!err?.response) {
          console.log('[useCreateSale] No response — falling back to local queue');
          return createLocalSale(payload);
        }
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[useCreateSale] onSuccess fired — invalidating queries');
      qc.invalidateQueries({ queryKey: salesKeys.all });
      qc.invalidateQueries({ queryKey: salesKeys.list() });
      qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
    onError: (e) => {
      console.error('[useCreateSale] onError fired:', e.message, e.response?.status);
      showToast('error', (e.response?.data as any)?.message || 'Sale failed');
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
      showToast('error', (e.response?.data as any)?.message || 'Refund failed');
    },
  });
}
