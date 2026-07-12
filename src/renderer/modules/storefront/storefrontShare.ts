/** Absolute share URL for a business shop page. */
export function storefrontShareUrl(slug: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/@${slug}`;
  }
  return `https://custosell.custospark.com/@${slug}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
