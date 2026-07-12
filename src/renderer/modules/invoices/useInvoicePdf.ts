import { axiosInstance } from '../../app/api/axiosConfig';
import { INVOICES, STOREFRONT } from '../../shared/api/endpoints/endpoints';

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

async function fetchPdfBlob(
  url: string,
  fallbackFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const { data, headers, status } = await axiosInstance.get(url, {
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
  const filename = filenameFromDisposition(disposition, fallbackFilename);
  const blob = new Blob([data], { type: contentType.includes('pdf') ? 'application/pdf' : contentType });

  return { blob, filename };
}

export async function fetchInvoicePdfBlob(invoiceId: number): Promise<{ blob: Blob; filename: string }> {
  return fetchPdfBlob(INVOICES.PDF(invoiceId), `invoice-${invoiceId}.pdf`);
}

/** B2C Discover — shop-letterhead PDF via storefront buyer route. */
export async function fetchStorefrontBuyerInvoicePdfBlob(
  orderId: number,
): Promise<{ blob: Blob; filename: string }> {
  return fetchPdfBlob(STOREFRONT.MY_ORDER_INVOICE_PDF(orderId), `invoice-order-${orderId}.pdf`);
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

async function openPdfBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (!tab) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups to view the invoice PDF');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function viewInvoicePdf(invoiceId: number): Promise<void> {
  const { blob } = await fetchInvoicePdfBlob(invoiceId);
  await openPdfBlob(blob);
}

export async function downloadInvoicePdf(invoiceId: number): Promise<void> {
  const { blob, filename } = await fetchInvoicePdfBlob(invoiceId);
  downloadBlob(blob, filename);
}

export async function viewStorefrontBuyerInvoicePdf(orderId: number): Promise<void> {
  const { blob } = await fetchStorefrontBuyerInvoicePdfBlob(orderId);
  await openPdfBlob(blob);
}

export async function downloadStorefrontBuyerInvoicePdf(orderId: number): Promise<void> {
  const { blob, filename } = await fetchStorefrontBuyerInvoicePdfBlob(orderId);
  downloadBlob(blob, filename);
}
