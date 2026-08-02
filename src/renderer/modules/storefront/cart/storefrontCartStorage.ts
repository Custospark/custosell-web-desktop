import type { StorefrontCartsBySlug } from './storefrontCartTypes';

/** LocalStorage mirror of the storefront cart so refreshes don't lose selections. */

export const STOREFRONT_CART_KEY = 'custosell.storefront.cart.v1';

/** Read the persisted cart. Returns {} on missing/corrupt data. */
export function loadStorefrontCart(): StorefrontCartsBySlug {
  try {
    const raw = localStorage.getItem(STOREFRONT_CART_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as StorefrontCartsBySlug;
  } catch {
    return {};
  }
}

/** Write the whole cart map out. Called after every car-mutating action. */
export function saveStorefrontCart(carts: StorefrontCartsBySlug): void {
  try {
    localStorage.setItem(STOREFRONT_CART_KEY, JSON.stringify(carts));
  } catch {
    // Quota / private mode — cart stays in-memory only.
  }
}

/** Remove the persisted cart entirely (empty cart, logout, reset). */
export function clearStorefrontCart(): void {
  try {
    localStorage.removeItem(STOREFRONT_CART_KEY);
  } catch {
    // ignore
  }
}