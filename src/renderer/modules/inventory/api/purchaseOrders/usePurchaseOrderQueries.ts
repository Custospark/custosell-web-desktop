import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { inventoryKeys } from '../products/ProductQueries';
import { PURCHASE_ORDERS } from './purchaseOrderEndpoints';
import { purchaseOrderKeys } from './purchaseOrderQueryKeys';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  ReceivePurchaseOrderPayload,
} from './purchaseOrderTypes';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (inner && typeof inner === 'object' && 'id' in (inner as object)) {
      return inner as T;
    }
  }
  return data as T;
}

function apiError(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiError>;
  const msg = axiosErr.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  const errors = axiosErr.response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0];
    if (typeof first === 'string') return first;
  }
  return sanitizeErrorMessage(err, fallback);
}

function invalidatePoQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: purchaseOrderKeys.all });
  qc.invalidateQueries({ queryKey: inventoryKeys.products() });
  qc.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
}

export function usePurchaseOrders(filters?: { status?: string }, enabled = true) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PURCHASE_ORDERS.INDEX, { params: filters });
      return unwrapList<PurchaseOrder>(data);
    },
    enabled,
    retry: false,
  });
}

export function useIncomingPurchaseOrders(filters?: { status?: string }, enabled = true) {
  return useQuery({
    queryKey: purchaseOrderKeys.incoming(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PURCHASE_ORDERS.INCOMING, { params: filters });
      return unwrapList<PurchaseOrder>(data);
    },
    enabled,
    retry: false,
  });
}

export function usePurchaseOrder(id: number, enabled = true) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(PURCHASE_ORDERS.DETAIL(id));
      return unwrapEntity<PurchaseOrder>(data);
    },
    enabled: enabled && id > 0,
    retry: false,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, CreatePurchaseOrderPayload>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.INDEX, payload);
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `Draft PO ${po.po_number} created`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to create purchase order')),
  });
}

export function useSubmitPurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, number>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.SUBMIT(id));
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} submitted`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to submit purchase order')),
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, number>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.CANCEL(id));
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} cancelled`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to cancel purchase order')),
  });
}

export function useAcceptPurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, number>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.ACCEPT(id));
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} accepted`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to accept purchase order')),
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, { id: number; rejection_reason: string }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, rejection_reason }) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.REJECT(id), { rejection_reason });
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} rejected`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to reject purchase order')),
  });
}

export function useFulfillPurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, number>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.FULFILL(id));
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} fulfilled — stock deducted`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to fulfill purchase order')),
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<PurchaseOrder, AxiosError<ApiError>, { id: number; payload: ReceivePurchaseOrderPayload }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.post(PURCHASE_ORDERS.RECEIVE(id), payload);
      return unwrapEntity<PurchaseOrder>(data);
    },
    onSuccess: (po) => {
      invalidatePoQueries(qc);
      showToast('success', `PO ${po.po_number} received into stock`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to receive purchase order')),
  });
}
