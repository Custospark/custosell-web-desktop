/** Last delivery contact for Discover reorders. */

export type StorefrontBuyerContact = {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
};

export const STOREFRONT_BUYER_CONTACT_KEY = 'custosell.storefront.buyerContact.v1';

const empty: StorefrontBuyerContact = {
  customer_name: '',
  customer_phone: '',
  delivery_address: '',
  delivery_city: '',
};

export function loadBuyerContact(): StorefrontBuyerContact {
  try {
    const raw = localStorage.getItem(STOREFRONT_BUYER_CONTACT_KEY);
    if (!raw) return { ...empty };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...empty };
    const row = parsed as Partial<StorefrontBuyerContact>;
    return {
      customer_name: typeof row.customer_name === 'string' ? row.customer_name.trim() : '',
      customer_phone: typeof row.customer_phone === 'string' ? row.customer_phone.trim() : '',
      delivery_address: typeof row.delivery_address === 'string' ? row.delivery_address.trim() : '',
      delivery_city: typeof row.delivery_city === 'string' ? row.delivery_city.trim() : '',
    };
  } catch {
    return { ...empty };
  }
}

/** Merges fields so a phone-only save keeps previous name/address. */
export function saveBuyerContact(patch: Partial<StorefrontBuyerContact>): void {
  try {
    const prev = loadBuyerContact();
    const next: StorefrontBuyerContact = {
      customer_name: (patch.customer_name ?? prev.customer_name).trim(),
      customer_phone: (patch.customer_phone ?? prev.customer_phone).trim(),
      delivery_address: (patch.delivery_address ?? prev.delivery_address).trim(),
      delivery_city: (patch.delivery_city ?? prev.delivery_city).trim(),
    };
    if (!next.customer_name && !next.customer_phone && !next.delivery_address && !next.delivery_city) {
      return;
    }
    localStorage.setItem(STOREFRONT_BUYER_CONTACT_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode
  }
}
