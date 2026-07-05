import { axiosInstance } from '../../app/api/axiosConfig';
import { PAYMENTS } from '../../shared/api/endpoints/endpoints';

export async function fetchPaymentReceiptPdfBlob(paymentId: number): Promise<Blob> {
  const { data } = await axiosInstance.get(PAYMENTS.RECEIPT(paymentId), {
    responseType: 'blob',
  });
  return data as Blob;
}

export async function viewPaymentReceiptPdf(paymentId: number): Promise<void> {
  const blob = await fetchPaymentReceiptPdfBlob(paymentId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPaymentReceiptPdf(paymentId: number, receiptNumber: string): Promise<void> {
  const blob = await fetchPaymentReceiptPdfBlob(paymentId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${receiptNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
