import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { useToast } from '../../../app/contexts/useToast';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { storefrontShareUrl } from '../storefrontShare';
import { downloadStorefrontQrPng } from './storefrontQrDownload';

interface StorefrontQrCodeProps {
  slug: string;
  size?: number;
  className?: string;
  label?: string | null;
  /** Kept for Shop page - Download PNG beside the QR. */
  showDownload?: boolean;
}

/**
 * Shop QR - self-hosted canvas (no third-party image API).
 */
export function StorefrontQrCode({
  slug,
  size = 96,
  className,
  label = 'Scan to open this shop',
  showDownload = false,
}: StorefrontQrCodeProps) {
  const { showToast } = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const url = storefrontShareUrl(slug);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then((out) => {
      if (!cancelled) setDataUrl(out);
    }).catch(() => {
      if (!cancelled) setDataUrl(null);
    });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  const qrBlock = (
    <div className="flex flex-col items-center">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR code for ${url}`}
          width={size}
          height={size}
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        />
      ) : (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
          style={{ width: size, height: size }}
          aria-hidden
        />
      )}
      {label ? (
        <p className="mt-1.5 max-w-[16rem] text-center text-[11px] font-medium leading-snug text-slate-600">
          {label}
        </p>
      ) : null}
    </div>
  );

  if (showDownload) {
    return (
      <figure
        className={cn(
          'flex min-w-0 flex-col items-center gap-3 sm:flex-row sm:items-center',
          className,
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          disabled={downloading || !slug.trim()}
          loading={downloading}
          onClick={() => {
            setDownloading(true);
            void downloadStorefrontQrPng(slug)
              .then(() => showToast('success', 'QR code downloaded'))
              .catch(() => showToast('error', 'Could not download QR - try again.'))
              .finally(() => setDownloading(false));
          }}
          title="Download a print-ready PNG"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download PNG
        </Button>
        {qrBlock}
      </figure>
    );
  }

  return (
    <figure className={cn('flex flex-col items-center', className)}>
      {qrBlock}
    </figure>
  );
}

/** Compact Download PNG control for settings action rows. */
export function StorefrontQrDownloadButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={downloading || !slug.trim()}
      loading={downloading}
      className={cn('h-8 gap-1.5 px-2.5 text-xs', className)}
      title="Download a print-ready PNG"
      onClick={() => {
        setDownloading(true);
        void downloadStorefrontQrPng(slug)
          .then(() => showToast('success', 'QR code downloaded'))
          .catch(() => showToast('error', 'Could not download QR - try again.'))
          .finally(() => setDownloading(false));
      }}
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Download PNG
    </Button>
  );
}
