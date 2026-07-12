import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { useToast } from '../../../app/contexts/useToast';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { storefrontShareUrl } from '../storefrontShare';

interface StorefrontQrCodeProps {
  slug: string;
  size?: number;
  className?: string;
  label?: string;
  showDownload?: boolean;
}

const DOWNLOAD_SIZE = 512;

/**
 * Shop QR — self-hosted canvas (no third-party image API).
 * Optional PNG download for print / stickers.
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

  const downloadPng = async () => {
    setDownloading(true);
    try {
      const png = await QRCode.toDataURL(url, {
        width: DOWNLOAD_SIZE,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      const a = document.createElement('a');
      a.href = png;
      a.download = `${slug}-shop-qr.png`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('success', 'QR code downloaded');
    } catch {
      showToast('error', 'Could not download QR — try again.');
    } finally {
      setDownloading(false);
    }
  };

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
        <p className="mt-1.5 text-center text-[11px] font-medium text-slate-600">
          {label}
        </p>
      ) : null}
    </div>
  );

  const downloadBtn = showDownload ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 gap-1.5"
      disabled={downloading || !slug.trim()}
      loading={downloading}
      onClick={() => void downloadPng()}
      title="Download a print-ready PNG"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Download PNG
    </Button>
  ) : null;

  if (showDownload) {
    return (
      <figure className={cn('flex flex-row items-center gap-3', className)}>
        {downloadBtn}
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
