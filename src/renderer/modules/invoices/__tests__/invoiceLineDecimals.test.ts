import { describe, expect, it } from 'vitest';
import { lineNetTotal } from '../invoiceLineItems';

/**
 * Locks decimal quantity support in invoice line items:
 * a 0.5 kg line prices at unit_price x 0.5, line discounts still apply,
 * and integer quantities are unaffected.
 */
describe('invoice line items with decimals', () => {
  it('prices a 0.5 quantity line correctly', () => {
    expect(lineNetTotal({ unit_price: 4000, quantity: 0.5, discount_amount: 0 })).toBe(2000);
  });

  it('applies line discount on fractional quantity', () => {
    expect(lineNetTotal({ unit_price: 4000, quantity: 0.5, discount_amount: 100 })).toBe(1900);
  });

  it('keeps whole-number quantities unchanged', () => {
    expect(lineNetTotal({ unit_price: 3000, quantity: 2, discount_amount: 0 })).toBe(6000);
  });

  it('never goes negative', () => {
    expect(lineNetTotal({ unit_price: 4000, quantity: 0.5, discount_amount: 5000 })).toBe(0);
  });
});