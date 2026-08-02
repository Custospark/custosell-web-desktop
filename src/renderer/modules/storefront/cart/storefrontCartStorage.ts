import type {
  StorefrontCartBag,
  StorefrontCartShopMeta,
  StorefrontCartsBySlug,
} from './storefrontCartTypes';

/** LocalStorage mirror of the storefront cart so refreshes don't lose selections. */

export const STOREFRONT_CART_KEY = 'custosell.storefront.cart.v1';

const TEXT_FIELDS: (keyof StorefrontCartBag)[] = [
  'notes',
  'customer_name',
  'customer_phone',
  'delivery_address',
  'delivery_city',
];

/** Guarantee every text field is a string so consumers can `.trim()` safely. */
function sanitizeBag(input: unknown): StorefrontCartBag | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const bag = input as Partial<Record<keyof StorefrontCartBag, unknown>> & {
    shop: unknown;
    items: unknown;
  };
  const shop = bag.shop as Partial<StorefrontCartShopMeta> | undefined;
  if (
    !shop || typeof shop !== 'object' || typeof shop.slug !== 'string' ||
    !Array.isArray(bag.items)
  ) {
    return null;
  }
  const row: StorefrontCartBag = {
    shop,
    items: bag.items as StorefrontCartBag['items'],
    notes: '',
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_city: '',
  };
  for (const f of TEXT_FIELDS) {
    if (typeof bag[f] === 'string') row[f] = bag[f] as string;
  }
  return row;
}

/** Read the persisted cart. Returns {} on missing/corrupt data. */
export function loadStorefrontCart(): StorefrontCartsBySlug {
  try {
    const raw = localStorage.getItem(STOREFRONT_CART_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const carts: StorefrontCartsBySlug = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      const bag = sanitizeBag(value);
      if (bag && bag.shop.slug === slug) carts[slug] = bag;
    }
    return carts;
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