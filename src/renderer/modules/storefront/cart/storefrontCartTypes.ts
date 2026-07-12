import type { StorefrontCartItem, StorefrontShop } from '../api/storefrontTypes';
import { loadBuyerContact } from './storefrontBuyerContactStorage';
import { effectiveUnitPrice } from '../ui/productPrice';

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
  delivery_address: string;
  delivery_city: string;
};

export type StorefrontCartsBySlug = Record<string, StorefrontCartBag>;

export type StorefrontBagContactPatch = Partial<
  Pick<
    StorefrontCartBag,
    'customer_name' | 'customer_phone' | 'notes' | 'delivery_address' | 'delivery_city'
  >
>;

/** New bags inherit last saved delivery contact so reorders skip re-typing. */
export function emptyBag(shop: StorefrontCartShopMeta): StorefrontCartBag {
  const saved = loadBuyerContact();
  return {
    shop,
    items: [],
    notes: '',
    customer_name: saved.customer_name,
    customer_phone: saved.customer_phone,
    delivery_address: saved.delivery_address,
    delivery_city: saved.delivery_city,
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
    (sum, line) => sum + effectiveUnitPrice(line.product) * line.quantity,
    0,
  );
}

export function totalLineCount(carts: StorefrontCartsBySlug): number {
  return Object.values(carts).reduce((sum, bag) => sum + bagLineCount(bag), 0);
}
