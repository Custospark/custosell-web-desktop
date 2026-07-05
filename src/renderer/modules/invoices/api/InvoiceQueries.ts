import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { INVOICES } from '../../../shared/api/endpoints/endpoints';
import type { Invoice } from './InvoiceTypes';
import type { RecordPaymentResult } from '../../payments/paymentTypes';
import { normalizePayment, buildPaymentFormData } from '../../payments/paymentQueries';
import type { RecordPaymentPayload } from '../../payments/paymentTypes';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (filters?: Record<string, string>) => [...invoiceKeys.all, 'list', filters] as const,
  detail: (id: number) => [...invoiceKeys.all, 'detail', id] as const,
};

const invoiceQueryDefaults = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
};

function normalizeInvoicesList(payload: unknown): Invoice[] {
  if (Array.isArray(payload)) return payload as Invoice[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Invoice[];
  }
  return [];
}

function normalizeInvoiceResponse(payload: unknown): Invoice {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && obj.data !== null && 'id' in obj.data) {
      return obj.data as Invoice;
    }
    if ('id' in obj && 'invoice_number' in obj) {
      return obj as Invoice;
    }
  }
  throw new Error('Invalid invoice response');
}

function prependInvoiceToCache(qc: QueryClient, invoice: Invoice): void {
  qc.setQueryData<Invoice[]>(invoiceKeys.list(), (old) => {
    const list = old ?? [];
    if (list.some((i) => i.id === invoice.id)) return list;
    return [invoice, ...list];
  });
}

function upsertInvoiceInCache(qc: QueryClient, invoice: Invoice): void {
  qc.setQueryData<Invoice[]>(invoiceKeys.list(), (old) => {
    const list = old ?? [];
    const idx = list.findIndex((i) => i.id === invoice.id);
    if (idx === -1) return [invoice, ...list];
    const next = [...list];
    next[idx] = invoice;
    return next;
  });
}

function removeInvoiceFromCache(qc: QueryClient, id: number): void {
  qc.setQueryData<Invoice[]>(invoiceKeys.list(), (old) =>
    (old ?? []).filter((i) => i.id !== id),
  );
}

export function useInvoices(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<Invoice[]>({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${INVOICES.BASE}${params ? `?${params}` : ''}`);
      return normalizeInvoicesList(data);
    },
    placeholderData: (prev) => prev ?? [],
    ...invoiceQueryDefaults,
  });
}

export function useInvoice(id: number) {
  return useQuery<Invoice>({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(INVOICES.BY_ID(id));
      return normalizeInvoiceResponse(data);
    },
    enabled: Boolean(id),
    ...invoiceQueryDefaults,
  });
}

export type UpdateInvoicePayload = {
  customer_id?: number | null;
  issue_date: string;
  due_date: string;
  tax_total?: number;
  items: { product_id?: number | null; description: string; quantity: number; unit_price: number; subtotal: number }[];
  notes?: string;
};

export function useUpdateInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, { id: number; payload: UpdateInvoicePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.put(INVOICES.BY_ID(id), payload);
      return normalizeInvoiceResponse(data);
    },
    onSuccess: (invoice) => {
      upsertInvoiceInCache(qc, invoice);
      qc.setQueryData(invoiceKeys.detail(invoice.id), invoice);
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice updated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to update invoice')),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, { customer_id?: number | null; issue_date: string; due_date: string; tax_total?: number; items: { product_id?: number | null; description: string; quantity: number; unit_price: number; subtotal: number }[]; notes?: string }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(INVOICES.BASE, payload);
      return normalizeInvoiceResponse(data);
    },
    onSuccess: (invoice) => {
      prependInvoiceToCache(qc, invoice);
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice created as draft — send it when ready');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to create invoice')),
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(INVOICES.SEND(id));
      return normalizeInvoiceResponse(data);
    },
    onSuccess: (invoice) => {
      upsertInvoiceInCache(qc, invoice);
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice sent');
    },
    onError: () => showToast('error', 'Failed to send invoice'),
  });
}

function normalizeRecordPaymentResponse(payload: unknown): RecordPaymentResult {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.invoice && obj.payment) {
      return {
        invoice: normalizeInvoiceResponse(obj.invoice),
        payment: normalizePayment(obj.payment),
      };
    }
  }
  return {
    invoice: normalizeInvoiceResponse(payload),
    payment: normalizePayment({ id: 0, receipt_number: '—', amount: 0, balance_after: 0 }),
  };
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<RecordPaymentResult, AxiosError, { id: number } & RecordPaymentPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const formData = buildPaymentFormData(payload);
      const { data } = await axiosInstance.post(INVOICES.PAYMENT(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data && typeof data === 'object' && 'payment' in data) {
        return normalizeRecordPaymentResponse(data);
      }
      return {
        invoice: normalizeInvoiceResponse(data),
        payment: normalizePayment({
          id: 0,
          business_id: 0,
          payable_type: 'invoice',
          payable_id: id,
          receipt_number: 'PENDING',
          amount: payload.amount,
          payment_method: payload.payment_method,
          balance_after: 0,
          paid_at: new Date().toISOString(),
        }),
      };
    },
    onSuccess: ({ invoice }) => {
      upsertInvoiceInCache(qc, invoice);
      qc.setQueryData(invoiceKeys.detail(invoice.id), invoice);
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Payment recorded');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to record payment')),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => { await axiosInstance.delete(INVOICES.BY_ID(id)); },
    onSuccess: (_, id) => {
      removeInvoiceFromCache(qc, id);
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice deleted');
    },
    onError: () => showToast('error', 'Failed to delete invoice'),
  });
}
