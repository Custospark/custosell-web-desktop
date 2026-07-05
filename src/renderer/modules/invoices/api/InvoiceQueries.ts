import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { INVOICES } from '../../../shared/api/endpoints/endpoints';
import type { Invoice } from './InvoiceTypes';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (filters?: Record<string, string>) => [...invoiceKeys.all, 'list', filters] as const,
  detail: (id: number) => [...invoiceKeys.all, 'detail', id] as const,
};

export function useInvoices(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<Invoice[]>({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Invoice[] }>(`${INVOICES.BASE}${params ? `?${params}` : ''}`);
      return data.data ?? [];
    },
  });
}

export function useInvoice(id: number) {
  return useQuery<Invoice>({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Invoice }>(INVOICES.BY_ID(id));
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, { customer_id?: number | null; issue_date: string; due_date: string; items: { product_id?: number | null; description: string; quantity: number; unit_price: number; subtotal: number }[]; notes?: string }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: Invoice }>(INVOICES.BASE, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice created');
    },
    onError: () => showToast('error', 'Failed to create invoice'),
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post<{ data: Invoice }>(INVOICES.SEND(id));
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice sent');
    },
    onError: () => showToast('error', 'Failed to send invoice'),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Invoice, AxiosError, { id: number; amount: number; payment_method: string }>({
    mutationFn: async ({ id, amount, payment_method }) => {
      const { data } = await axiosInstance.post<{ data: Invoice }>(INVOICES.PAYMENT(id), { amount, payment_method });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Payment recorded');
    },
    onError: () => showToast('error', 'Failed to record payment'),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => { await axiosInstance.delete(INVOICES.BY_ID(id)); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', 'Invoice deleted');
    },
    onError: () => showToast('error', 'Failed to delete invoice'),
  });
}
