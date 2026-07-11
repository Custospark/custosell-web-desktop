import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import { INVOICES, PAYMENTS, SALES } from '../api/endpoints/endpoints';
import { invoiceKeys } from '../../modules/invoices/api/InvoiceQueries';
import { salesKeys } from '../../modules/sales/api/salesQueries';

export interface SendDocumentEmailPayload {
  to?: string;
  message?: string;
}

export interface SendDocumentEmailResult {
  sent_to: string;
  sent_at: string;
  document_type: string;
  document_ref: string;
  email_sent_count: number;
  last_emailed_at?: string | null;
}

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'Failed to send email';
}

async function postDocumentEmail(url: string, payload: SendDocumentEmailPayload): Promise<SendDocumentEmailResult> {
  const body: SendDocumentEmailPayload = {};
  const to = payload.to?.trim();
  const message = payload.message?.trim();
  if (to) body.to = to;
  if (message) body.message = message;

  const { data } = await axiosInstance.post<SendDocumentEmailResult>(url, body);
  return data;
}

export function useEmailInvoice() {
  const { showToast } = useToast();
  const qc = useQueryClient();

  return useMutation<SendDocumentEmailResult, AxiosError, { id: number; payload: SendDocumentEmailPayload }>({
    mutationFn: ({ id, payload }) => postDocumentEmail(INVOICES.EMAIL(id), payload),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      showToast('success', `Invoice emailed to ${result.sent_to}`);
    },
    onError: (error) => showToast('error', extractErrorMessage(error)),
  });
}

export function useEmailPaymentReceipt() {
  const { showToast } = useToast();
  const qc = useQueryClient();

  return useMutation<SendDocumentEmailResult, AxiosError, { id: number; payload: SendDocumentEmailPayload }>({
    mutationFn: ({ id, payload }) => postDocumentEmail(PAYMENTS.EMAIL(id), payload),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.all });
      void qc.invalidateQueries({ queryKey: salesKeys.all });
      showToast('success', `Receipt emailed to ${result.sent_to}`);
    },
    onError: (error) => showToast('error', extractErrorMessage(error)),
  });
}

export function useEmailSaleReceipt() {
  const { showToast } = useToast();
  const qc = useQueryClient();

  return useMutation<SendDocumentEmailResult, AxiosError, { id: number; payload: SendDocumentEmailPayload }>({
    mutationFn: ({ id, payload }) => postDocumentEmail(SALES.EMAIL(id), payload),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: salesKeys.all });
      showToast('success', `Receipt emailed to ${result.sent_to}`);
    },
    onError: (error) => showToast('error', extractErrorMessage(error)),
  });
}
