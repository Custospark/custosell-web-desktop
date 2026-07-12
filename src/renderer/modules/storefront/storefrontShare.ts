/** Absolute share URL for a business shop page (`/@slug`, HashRouter-safe). */
export function storefrontShareUrl(slug: string): string {
  const handle = `/@${slug}`;
  if (typeof window === 'undefined' || !window.location?.origin) {
    return `https://custosell.custospark.com${handle}`;
  }
  const { origin, pathname, hash } = window.location;
  // Electron / HashRouter: app routes live after `#`
  if (hash.startsWith('#/') || hash === '#') {
    const basePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    return `${origin}${basePath || ''}#${handle}`;
  }
  return `${origin}${handle}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
