import type { StorefrontProduct } from '../api/storefrontTypes';

/** Snapshot saved for later — survives catalog refresh / delisting for display. */
export type StorefrontWishlistItem = {
  key: string;
  productId: number;
  shopSlug: string;
  shopName: string;
  currency: string;
  savedAt: string;
  product: StorefrontProduct;
};

export function wishlistItemKey(shopSlug: string, productId: number): string {
  return `${shopSlug}:${productId}`;
}

export function toWishlistItem(product: StorefrontProduct, shopSlug?: string): StorefrontWishlistItem | null {
  const slug = (shopSlug || product.business?.slug || '').trim();
  if (!slug || !product.id) return null;
  return {
    key: wishlistItemKey(slug, product.id),
    productId: product.id,
    shopSlug: slug,
    shopName: product.business?.name || slug,
    currency: product.business?.currency || 'UGX',
    savedAt: new Date().toISOString(),
    product: {
      ...product,
      business: product.business
        ? { ...product.business, slug }
        : {
            name: slug,
            slug,
            logo_path: null,
            city: null,
            currency: 'UGX',
          },
    },
  };
}
