import type { StorefrontWishlistItem } from './storefrontWishlistTypes';

const PREFIX = 'custosell.storefront.wishlist.v1';

export function wishlistStorageKey(ownerId: string | number | null | undefined): string {
  const id = ownerId != null && String(ownerId).trim() !== '' ? String(ownerId) : 'guest';
  return `${PREFIX}.${id}`;
}

export function loadWishlist(ownerId: string | number | null | undefined): StorefrontWishlistItem[] {
  try {
    const raw = localStorage.getItem(wishlistStorageKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWishlistItem);
  } catch {
    return [];
  }
}

export function saveWishlist(
  ownerId: string | number | null | undefined,
  items: StorefrontWishlistItem[],
): void {
  try {
    localStorage.setItem(wishlistStorageKey(ownerId), JSON.stringify(items));
  } catch {
    // Quota / private mode
  }
}

/** Merge guest list into the signed-in list (signed-in wins on duplicate keys). */
export function mergeWishlistLists(
  accountItems: StorefrontWishlistItem[],
  guestItems: StorefrontWishlistItem[],
): StorefrontWishlistItem[] {
  const byKey = new Map<string, StorefrontWishlistItem>();
  for (const item of guestItems) byKey.set(item.key, item);
  for (const item of accountItems) byKey.set(item.key, item);
  return Array.from(byKey.values()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function isWishlistItem(row: unknown): row is StorefrontWishlistItem {
  if (!row || typeof row !== 'object') return false;
  const r = row as Partial<StorefrontWishlistItem>;
  return (
    typeof r.key === 'string'
    && typeof r.productId === 'number'
    && typeof r.shopSlug === 'string'
    && r.product != null
    && typeof r.product === 'object'
  );
}
