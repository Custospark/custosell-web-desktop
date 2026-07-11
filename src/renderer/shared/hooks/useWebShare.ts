import { useCallback, useMemo } from 'react';
import { useToast } from '../../app/contexts/useToast';

export interface ShareableDocument {
  title: string;
  text: string;
  url?: string;
  files?: File[];
}

export function useWebShare() {
  const { showToast } = useToast();

  const canShare = useMemo(() => {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }, []);

  const canShareFiles = useMemo(() => {
    return canShare && typeof navigator.canShare === 'function';
  }, [canShare]);

  const share = useCallback(async (doc: ShareableDocument) => {
    if (!canShare) {
      try {
        await navigator.clipboard.writeText(doc.text);
        showToast('success', 'Copied to clipboard');
      } catch {
        showToast('error', 'Cannot share from this device');
      }
      return;
    }

    try {
      const shareData: ShareData = { title: doc.title, text: doc.text };
      if (doc.url) shareData.url = doc.url;

      if (doc.files && doc.files.length > 0 && canShareFiles) {
        if (navigator.canShare({ files: doc.files })) {
          shareData.files = doc.files;
        }
      }

      await navigator.share(shareData);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(doc.text);
        showToast('success', 'Copied to clipboard');
      } catch {
        showToast('error', 'Share cancelled or unavailable');
      }
    }
  }, [canShare, canShareFiles, showToast]);

  return { share, canShare };
}

export function receiptShareText(
  businessName: string,
  receiptNumber: string,
  total: number,
  currency: string,
  paymentMethod: string,
): string {
  return [
    `${businessName.toUpperCase()}`,
    `Receipt: ${receiptNumber}`,
    `Total: ${currency} ${total.toFixed(2)}`,
    `Paid via: ${paymentMethod}`,
    'Thank you for your purchase!',
  ].join('\n');
}

export function invoiceShareText(
  businessName: string,
  invoiceNumber: string,
  customerName: string,
  total: number,
  currency: string,
  status: string,
): string {
  return [
    `${businessName.toUpperCase()}`,
    `Invoice: ${invoiceNumber}`,
    `Customer: ${customerName}`,
    `Total: ${currency} ${total.toFixed(2)}`,
    `Status: ${status}`,
  ].join('\n');
}
