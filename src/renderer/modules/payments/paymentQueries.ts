import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import { sanitizeErrorMessage, shouldCompleteMutationLocally } from '../../app/store/offline/core/offlineQueryUtils';
import { SALES } from '../../shared/api/endpoints/endpoints';
import { completeOfflineSalePayment } from '../../app/store/offline/payments/completeOfflinePayment';
import type { Payment, RecordPaymentPayload, RecordSalePaymentResult } from './paymentTypes';
import type { Sale } from '../sales/api/salesTypes';

export function normalizePayment(payload: unknown): Payment {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payment response');
  }
  const p = payload as Record<string, unknown>;
  return {
    id: Number(p.id),
    business_id: Number(p.business_id),
    payable_type: p.payable_type as Payment['payable_type'],
    payable_id: Number(p.payable_id),
    receipt_number: String(p.receipt_number),
    amount: Number(p.amount),
    amount_tendered: p.amount_tendered != null ? Number(p.amount_tendered) : Number(p.amount),
    change_given: p.change_given != null ? Number(p.change_given) : null,
    payment_method: String(p.payment_method),
    balance_after: Number(p.balance_after),
    paid_at: String(p.paid_at),
    notes: p.notes != null ? String(p.notes) : null,
    attachment_path: p.attachment_path != null ? String(p.attachment_path) : null,
    attachment_url: p.attachment_url != null ? String(p.attachment_url) : null,
    recorded_by: p.recorded_by != null ? Number(p.recorded_by) : null,
    _pendingSync: p._pendingSync === true,
  };
}

function normalizeSaleFromPaymentResponse(payload: unknown): Sale {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: Sale }).data;
  }
  return payload as Sale;
}

export function buildPaymentFormData(payload: RecordPaymentPayload): FormData {
  const formData = new FormData();
  formData.append('amount', String(payload.amount));
  formData.append('payment_method', payload.payment_method);
  if (payload.notes) formData.append('notes', payload.notes);
  if (payload.amount_tendered != null) formData.append('amount_tendered', String(payload.amount_tendered));
  if (payload.change_given != null) formData.append('change_given', String(payload.change_given));
  if (payload.attachment) formData.append('attachment', payload.attachment);
  return formData;
}

export function getPaymentErrorMessage(err: unknown): string {
  return sanitizeErrorMessage(err, 'Failed to record payment');
}

export function useRecordSalePayment() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<RecordSalePaymentResult, AxiosError, { id: number } & RecordPaymentPayload>({
    mutationFn: async ({ id, ...payload }) => {
      if (shouldCompleteMutationLocally()) {
        return completeOfflineSalePayment(id, payload);
      }
      const formData = buildPaymentFormData(payload);
      const { data } = await axiosInstance.post(SALES.PAYMENT(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const obj = data as Record<string, unknown>;
      return {
        sale: normalizeSaleFromPaymentResponse(obj.sale ?? data),
        payment: normalizePayment(obj.payment),
      };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sales'] });
      showToast('success', 'Payment recorded');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to record payment')),
  });
}
