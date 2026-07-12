import type { StorefrontCartsBySlug } from './storefrontCartTypes';

export const STOREFRONT_CARTS_STORAGE_KEY = 'custosell.storefront.carts.v1';

export function loadStorefrontCarts(): StorefrontCartsBySlug {
  try {
    const raw = localStorage.getItem(STOREFRONT_CARTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as StorefrontCartsBySlug;
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
