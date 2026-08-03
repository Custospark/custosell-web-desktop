import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { BILLING } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/useToast';

export interface HistoryItem {
  type: 'payment' | 'change' | 'credit';
  event: string;
  status?: string;
  status_override?: string;
  description?: string;
  amount?: number;
  currency?: string | null;
  payment_id?: number;
  payment_type?: string;
  method?: string;
  transaction_reference?: string;
  topup_months?: number;
  credit_used?: number;
  change_type?: string;
  from_plan?: string;
  to_plan?: string;
  effective_at?: string;
  id?: number;
  credit_id?: number;
  at?: string;
}

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

export function useBillingHistory(enabled = true) {
  return useQuery<HistoryItem[]>({
    queryKey: ['billing', 'history'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: HistoryItem[] }>(BILLING.HISTORY);
      return data.data;
    },
    enabled,
  });
}

export async function downloadReceiptPdf(paymentId: number): Promise<{ blob: Blob; filename: string }> {
  const fallback = `receipt-${paymentId}.pdf`;
  const { data, headers, status } = await axiosInstance.get(BILLING.RECEIPT(paymentId), {
    responseType: 'blob',
    validateStatus: (s) => s < 500,
  });

  const responseHeaders = headers as Record<string, string>;
  const contentType = responseHeaders['content-type'] || 'application/octet-stream';

  if (status >= 400 || contentType.includes('application/json')) {
    const text = await (data as Blob).text();
    let message = 'Failed to load receipt';
    try {
      const json = JSON.parse(text) as { message?: string };
      message = json.message || message;
    } catch {
      /* use default */
    }
    throw new Error(message);
  }

  const disposition = responseHeaders['content-disposition'];
  const filename = filenameFromDisposition(disposition, fallback);
  const blob = new Blob([data], { type: contentType.includes('pdf') ? 'application/pdf' : contentType });

  return { blob, filename };
}

export function saveBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function useEmailReceipt() {
  const { showToast } = useToast();
  return useMutation<{ success: boolean; message: string }, Error, number>({
    mutationFn: async (paymentId: number) => {
      const { data } = await axiosInstance.post(BILLING.RECEIPT_EMAIL(paymentId));
      return data;
    },
    onSuccess: (data) => {
      showToast('success', data.message || 'Receipt sent.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to send receipt.';
      showToast('error', message);
    },
  });
}
