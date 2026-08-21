import { describe, expect, it } from 'vitest';
import salesReducer, { addToCart, updateQuantity } from '../salesSlice';
import type { SalesState } from '../salesTypes';

function initialState(): SalesState {
  return {
    cartItems: [],
    paymentMethod: 'cash',
    customerId: null,
    discountAmount: 0,
    discountType: 'fixed',
    notes: '',
    amountTendered: 0,
    activeOrderId: null,
    activeOrderMode: null,
  };
}

const sugar = {
  product_id: 1,
  name: 'Sugar',
  unit_price: 4000,
  wholesale_price: null,
  is_service: false,
  unit: 'Kg',
  supports_decimal_quantity: true,
  price_tier: 'retail' as const,
};

const cable = {
  product_id: 2,
  name: 'Cable Reel',
  unit_price: 5000,
  wholesale_price: null,
  is_service: false,
  unit: 'Roll',
  supports_decimal_quantity: false,
  price_tier: 'retail' as const,
};

/**
 * Locks decimal quantity behaviour in the POS cart:
 *  - decimal-capable products (weight/volume) store fractional quantities
 *  - piece products stay whole numbers
 *  - line totals are quantity x unit price (auto-priced)
 */
describe('sales cart decimal quantities', () => {
  it('adds a decimal-capable product with the flag preserved', () => {
    const next = salesReducer(initialState(), addToCart(sugar));
    expect(next.cartItems[0].quantity).toBe(1);
    expect(next.cartItems[0].supports_decimal_quantity).toBe(true);
    expect(next.cartItems[0].unit).toBe('Kg');
  });

  it('adds a piece product without decimal flag', () => {
    const next = salesReducer(initialState(), addToCart(cable));
    expect(next.cartItems[0].supports_decimal_quantity).toBe(false);
  });

  it('updateQuantity stores fractional quantity for decimal-capable products', () => {
    let state = salesReducer(initialState(), addToCart(sugar));
    state = salesReducer(state, updateQuantity({ product_id: 1, quantity: 0.5 }));
    expect(state.cartItems[0].quantity).toBe(0.5);
  });

  it('updateQuantity removes the line when quantity drops to zero or below', () => {
    let state = salesReducer(initialState(), addToCart(sugar));
    state = salesReducer(state, updateQuantity({ product_id: 1, quantity: 0 }));
    expect(state.cartItems).toHaveLength(0);
  });

  it('auto-prices the line as unit_price x quantity', () => {
    let state = salesReducer(initialState(), addToCart(sugar));
    state = salesReducer(state, updateQuantity({ product_id: 1, quantity: 0.5 }));
    const subtotal = state.cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0);
    expect(subtotal).toBe(2000);
  });
});