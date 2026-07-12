import { storefrontShareUrl } from '../storefrontShare';

interface StorefrontQrCodeProps {
  /** Shop slug — builds the public /@slug share URL. */
  slug: string;
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Shop QR — points buyers at the public storefront URL.
 * Uses a lightweight QR image endpoint (no extra npm dependency).
 */
export function StorefrontQrCode({
  slug,
  size = 96,
  className,
  label = 'Scan to open this shop',
}: StorefrontQrCodeProps) {
  const url = storefrontShareUrl(slug);
  const src =
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}`
    + `&margin=8&data=${encodeURIComponent(url)}`;

  return (
    <figure className={className}>
      <img
        src={src}
        alt={`QR code for ${url}`}
        width={size}
        height={size}
        className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
        loading="lazy"
      />
      {label ? (
        <figcaption className="mt-1.5 text-center text-[11px] font-medium text-slate-600">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
