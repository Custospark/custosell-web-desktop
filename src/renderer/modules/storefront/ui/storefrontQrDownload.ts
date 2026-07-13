import QRCode from 'qrcode';
import { storefrontShareUrl } from '../storefrontShare';

const DOWNLOAD_SIZE = 512;

/** Download a print-ready PNG for `{slug}-shop-qr.png`. */
export async function downloadStorefrontQrPng(slug: string): Promise<void> {
  const url = storefrontShareUrl(slug);
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
}
