import { axiosInstance } from '../../app/api/axiosConfig';
import { ESTIMATES } from '../../shared/api/endpoints/endpoints';

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

export async function fetchEstimatePdfBlob(estimateId: number): Promise<{ blob: Blob; filename: string }> {
  const fallback = `estimate-${estimateId}.pdf`;
  const { data, headers, status } = await axiosInstance.get(ESTIMATES.PDF(estimateId), {
    responseType: 'blob',
    validateStatus: (s) => s < 500,
  });

  const responseHeaders = headers as Record<string, string>;
  const contentType = responseHeaders['content-type'] || 'application/octet-stream';

  if (status >= 400 || contentType.includes('application/json')) {
    const text = await (data as Blob).text();
    let message = 'Failed to load estimate PDF';
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

export async function viewEstimatePdf(estimateId: number): Promise<void> {
  const { blob } = await fetchEstimatePdfBlob(estimateId);
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (!tab) {
    URL.revokeObjectURL(url);
    throw new Error('Allow pop-ups to view the estimate PDF');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadEstimatePdf(estimateId: number): Promise<void> {
  const { blob, filename } = await fetchEstimatePdfBlob(estimateId);
  downloadBlob(blob, filename);
}
