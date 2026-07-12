/** Last delivery name/phone for Discover reorders — users rarely change numbers. */

export type StorefrontBuyerContact = {
  customer_name: string;
  customer_phone: string;
};

export const STOREFRONT_BUYER_CONTACT_KEY = 'custosell.storefront.buyerContact.v1';

const empty: StorefrontBuyerContact = {
  customer_name: '',
  customer_phone: '',
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
    };
  } catch {
    return { ...empty };
  }
}

/** Merges non-empty fields so a phone-only save keeps the previous name. */
export function saveBuyerContact(patch: Partial<StorefrontBuyerContact>): void {
  try {
    const prev = loadBuyerContact();
    const next: StorefrontBuyerContact = {
      customer_name: (patch.customer_name ?? prev.customer_name).trim(),
      customer_phone: (patch.customer_phone ?? prev.customer_phone).trim(),
    };
    if (!next.customer_name && !next.customer_phone) return;
    localStorage.setItem(STOREFRONT_BUYER_CONTACT_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — in-memory bags still hold contact for this session
  }
}
