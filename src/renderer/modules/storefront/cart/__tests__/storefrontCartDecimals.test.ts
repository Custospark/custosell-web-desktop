import { describe, expect, it } from 'vitest';
import { bagTotal, emptyBag } from '../storefrontCartTypes';
import type { StorefrontCartItem } from '../../api/storefrontTypes';

function item(id: number, name: string, unitPrice: number, quantity: number, decimal: boolean, unit = 'Kg'): StorefrontCartItem {
  return {
    product: {
      id,
      name,
      unit_price: unitPrice,
      unit,
      supports_decimal_quantity: decimal,
      pricing_unit_label: decimal ? unit : null,
      description: null,
      image_path: null,
      stock_quantity: 100,
      in_stock: true,
      availability: 'in_stock',
    },
    quantity,
  };
}

function makeBag(items: StorefrontCartItem[]) {
  const bag = emptyBag({
    name: 'Test Shop',
    slug: 'test-shop',
    currency: 'UGX',
    city: 'Kampala',
    logo_path: null,
  });
  return { ...bag, items };
}

/**
 * Locks decimal quantity handling in the storefront cart:
 * fractional weights (0.5 kg sugar) price correctly and custom-unit
 * products still total with whole quantities.
 */
describe('storefront cart decimals', () => {
  it('prices a 0.5 kg item at unit price x 0.5', () => {
    const bag = makeBag([item(1, 'Sugar', 4000, 0.5, true)]);
    expect(bagTotal(bag)).toBe(2000);
  });

  it('totals mixed decimal and integer lines correctly', () => {
    const bag = makeBag([
      item(1, 'Sugar', 4000, 0.5, true),
      item(2, 'Bread', 3000, 2, false, 'Piece'),
    ]);
    expect(bagTotal(bag)).toBe(8000);
  });

  it('keeps custom-unit (integer) products at whole quantities', () => {
    const bag = makeBag([item(2, 'Cable Reel', 5000, 2, false, 'Roll')]);
    expect(bagTotal(bag)).toBe(10000);
  });
});