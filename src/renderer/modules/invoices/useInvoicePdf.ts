import { axiosInstance } from '../../app/api/axiosConfig';
import { INVOICES } from '../../shared/api/endpoints/endpoints';

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function fetchInvoicePdfBlob(invoiceId: number): Promise<{ blob: Blob; filename: string }> {
  const fallback = `invoice-${invoiceId}.pdf`;
  const { data, headers, status } = await axiosInstance.get(INVOICES.PDF(invoiceId), {
    responseType: 'blob',
    validateStatus: (s) => s < 500,
  });

  const responseHeaders = headers as Record<string, string>;
  const contentType = responseHeaders['content-type'] || 'application/octet-stream';

  if (status >= 400 || contentType.includes('application/json')) {
    const text = await (data as Blob).text();
    let message = 'Failed to load invoice PDF';
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

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function viewInvoicePdf(invoiceId: number): Promise<void> {
  const { blob } = await fetchInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (!tab) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups to view the invoice PDF');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadInvoicePdf(invoiceId: number): Promise<void> {
  const { blob, filename } = await fetchInvoicePdfBlob(invoiceId);
  downloadBlob(blob, filename);
}
