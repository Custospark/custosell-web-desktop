import type { StorefrontCartItem, StorefrontShop } from '../api/storefrontTypes';

export type StorefrontCartShopMeta = Pick<
  StorefrontShop,
  'name' | 'slug' | 'currency' | 'city' | 'logo_path'
>;

export type StorefrontCartBag = {
  shop: StorefrontCartShopMeta;
  items: StorefrontCartItem[];
  notes: string;
  customer_name: string;
  customer_phone: string;
};

export type StorefrontCartsBySlug = Record<string, StorefrontCartBag>;

export function emptyBag(shop: StorefrontCartShopMeta): StorefrontCartBag {
  return {
    shop,
    items: [],
    notes: '',
    customer_name: '',
    customer_phone: '',
  };
}

export function bagLineCount(bag: StorefrontCartBag): number {
  return bag.items.length;
}

export function bagUnitCount(bag: StorefrontCartBag): number {
  return bag.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function bagTotal(bag: StorefrontCartBag): number {
  return bag.items.reduce(
    (sum, line) => sum + Number(line.product.unit_price) * line.quantity,
    0,
  );
}

export function totalLineCount(carts: StorefrontCartsBySlug): number {
  return Object.values(carts).reduce((sum, bag) => sum + bagLineCount(bag), 0);
}
