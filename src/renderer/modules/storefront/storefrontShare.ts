/**
 * Absolute customer-facing share URL for a business shop (`/@slug`) or a single
 * product (`/@slug/p/<productSlug>`).
 * Always path-based (BrowserRouter) - never HashRouter `#/@slug`.
 * Marketing / QR / WhatsApp links must work on phones and the public web.
 * Priority: VITE_APP_URL > browser origin (http/https only) > hardcoded fallback.
 */
export function storefrontShareUrl(slug: string, productSlug?: string): string {
  const clean = String(slug).trim().replace(/^@/, '');
  const handle = productSlug ? `/@${clean}/p/${productSlug}` : `/@${clean}`;
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  if (configured) {
    return `${configured.replace(/\/+$/, '')}${handle}`;
  }
  const origin =
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    /^https?:\/\//.test(window.location.origin)
      ? window.location.origin
      : 'https://custosell.com';
  return `${origin}${handle}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
