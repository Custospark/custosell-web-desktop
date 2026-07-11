import { axiosInstance } from '../../app/api/axiosConfig';
import { SALES } from '../../shared/api/endpoints/endpoints';
import { downloadBlob } from '../invoices/useInvoicePdf';

export async function fetchSalesReceiptPdfBlob(saleId: number): Promise<{ blob: Blob; filename: string }> {
  const fallback = `receipt-${saleId}.pdf`;
  const { data, headers, status } = await axiosInstance.get(SALES.PDF(saleId), {
    responseType: 'blob',
    validateStatus: (s) => s < 500,
  });

  const responseHeaders = headers as Record<string, string>;
  const contentType = responseHeaders['content-type'] || 'application/octet-stream';

  if (status >= 400 || contentType.includes('application/json')) {
    const text = await (data as Blob).text();
    let message = 'Failed to load receipt PDF';
    try {
      const json = JSON.parse(text) as { message?: string };
      message = json.message || message;
    } catch {}
    throw new Error(message);
  }

  const disposition = responseHeaders['content-disposition'];
  const match = disposition?.match(/filename="?([^";\n]+)"?/i);
  const filename = match?.[1] ?? fallback;
  const blob = new Blob([data], { type: contentType.includes('pdf') ? 'application/pdf' : contentType });

  return { blob, filename };
}

export async function downloadSalesReceiptPdf(saleId: number): Promise<void> {
  const { blob, filename } = await fetchSalesReceiptPdfBlob(saleId);
  downloadBlob(blob, filename);
}
