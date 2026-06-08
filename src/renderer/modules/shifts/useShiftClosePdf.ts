import { axiosInstance } from '../../app/api/axiosConfig';
import { store } from '../../app/store/store';
import type { AuthUser } from '../../app/store/slices/authSlice';

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

export function canDownloadShiftClosePdf(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const perms = user.role?.permissions ?? {};
  return Boolean(perms['reports.view'] || perms['shifts.close_report']);
}

export async function fetchShiftClosePdfBlob(shiftId: number | string): Promise<{ blob: Blob; filename: string }> {
  const fallback = `shift-close-${shiftId}.pdf`;
  const { data, headers, status } = await axiosInstance.get('/reports/shift-close', {
    params: { shift_id: shiftId },
    responseType: 'blob',
    validateStatus: (s) => s < 500,
  });

  const responseHeaders = headers as Record<string, string>;
  const contentType = responseHeaders['content-type'] || 'application/octet-stream';

  if (status >= 400 || contentType.includes('application/json')) {
    const text = await (data as Blob).text();
    let message = 'Failed to download shift report';
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
  const blob = new Blob([data], { type: contentType });

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

function isOffline(): boolean {
  return store.getState().network.systemStatus === 'offline';
}

export async function downloadShiftClosePdf(shiftId: number | string): Promise<void> {
  if (isOffline()) {
    throw new Error('Connect to the internet to download the official PDF');
  }
  const { blob, filename } = await fetchShiftClosePdfBlob(shiftId);
  downloadBlob(blob, filename);
}

export async function openShiftClosePdfForPrint(shiftId: number | string): Promise<void> {
  const { blob } = await fetchShiftClosePdfBlob(shiftId);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups to print the official PDF');
  }
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  });
}
