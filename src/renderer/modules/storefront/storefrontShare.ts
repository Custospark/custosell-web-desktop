/**
 * Absolute customer-facing share URL for a business shop (`/@slug`).
 * Always path-based (BrowserRouter) — never HashRouter `#/@slug`.
 * Marketing / QR / WhatsApp links must work on phones and the public web.
 */
export function storefrontShareUrl(slug: string): string {
  const handle = `/@${String(slug).trim().replace(/^@/, '')}`;
  if (typeof window === 'undefined' || !window.location?.origin) {
    return `https://custosell.custospark.com${handle}`;
  }
  return `${window.location.origin}${handle}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
