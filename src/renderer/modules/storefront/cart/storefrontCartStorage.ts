import type { StorefrontCartsBySlug } from './storefrontCartTypes';

export const STOREFRONT_CARTS_STORAGE_KEY = 'custosell.storefront.carts.v1';

export function loadStorefrontCarts(): StorefrontCartsBySlug {
  try {
    const raw = localStorage.getItem(STOREFRONT_CARTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: StorefrontCartsBySlug = {};
    for (const [slug, bag] of Object.entries(parsed as Record<string, unknown>)) {
      if (!bag || typeof bag !== 'object') continue;
      const row = bag as Partial<StorefrontCartsBySlug[string]>;
      out[slug] = {
        shop: row.shop as StorefrontCartsBySlug[string]['shop'],
        items: Array.isArray(row.items) ? row.items : [],
        notes: typeof row.notes === 'string' ? row.notes : '',
        customer_name: typeof row.customer_name === 'string' ? row.customer_name : '',
        customer_phone: typeof row.customer_phone === 'string' ? row.customer_phone : '',
        delivery_address: typeof row.delivery_address === 'string' ? row.delivery_address : '',
        delivery_city: typeof row.delivery_city === 'string' ? row.delivery_city : '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStorefrontCarts(carts: StorefrontCartsBySlug): void {
  try {
    const nonempty = Object.fromEntries(
      Object.entries(carts).filter(([, bag]) => bag.items.length > 0),
    );
    localStorage.setItem(STOREFRONT_CARTS_STORAGE_KEY, JSON.stringify(nonempty));
  } catch {
    // Quota / private mode — keep in-memory only
  }
}
