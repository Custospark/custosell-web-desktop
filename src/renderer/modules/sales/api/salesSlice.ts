import type { CartItem, SalesState } from './salesTypes';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const initialState: SalesState = {
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

type LoadOrderPayload = {
  orderId: number;
  items: CartItem[];
  customerId: number | null;
  notes?: string | null;
  discountAmount?: number;
  mode: 'sale' | 'update';
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{
      product_id: number;
      name: string;
      unit_price: number;
      wholesale_price?: number | null;
      is_service?: boolean;
      unit?: string | null;
      supports_decimal_quantity?: boolean;
      tax_percentage?: number | string | null;
      tax_class?: string | null;
      price_tier?: 'retail' | 'wholesale';
    }>) {
      const tier = action.payload.price_tier ?? 'retail';
      const isService = action.payload.is_service ?? false;
      const wholesale = isService ? null : (action.payload.wholesale_price ?? null);
      const effectiveTier = isService ? 'retail' : tier;
      const effective = effectiveTier === 'wholesale' && wholesale != null ? wholesale : action.payload.unit_price;
      const existing = state.cartItems.find(
        (c) => c.product_id === action.payload.product_id && c.price_tier === effectiveTier,
      );
      if (existing) {
        existing.quantity += 1;
        existing.unit_price = effective;
      } else {
        state.cartItems.push({
          product_id: action.payload.product_id,
          name: action.payload.name,
          unit_price: effective,
          unit: action.payload.unit,
          supports_decimal_quantity: action.payload.supports_decimal_quantity ?? false,
          tax_percentage: action.payload.tax_percentage ?? null,
          tax_class: action.payload.tax_class ?? 'standard',
          quantity: 1,
          discount_amount: 0,
          price_tier: effectiveTier,
          retail_price: action.payload.unit_price,
          _wholesale_price: wholesale,
          is_service: isService,
        });
      }
    },
    updateQuantity(state, action: PayloadAction<{ product_id: number; tier?: 'retail' | 'wholesale'; quantity: number }>) {
      const { product_id, quantity } = action.payload;
      let item: CartItem | undefined;
      if (action.payload.tier) {
        item = state.cartItems.find((c) => c.product_id === product_id && c.price_tier === action.payload.tier);
      } else {
        item = state.cartItems.find((c) => c.product_id === product_id);
      }
      if (quantity <= 0) {
        state.cartItems = item ? state.cartItems.filter((c) => c !== item) : state.cartItems;
      } else if (item) {
        item.quantity = quantity;
      }
    },
    removeFromCart(state, action: PayloadAction<{ product_id: number; tier?: 'retail' | 'wholesale' }>) {
      state.cartItems = action.payload.tier
        ? state.cartItems.filter((c) => !(c.product_id === action.payload.product_id && c.price_tier === action.payload.tier))
        : state.cartItems.filter((c) => c.product_id !== action.payload.product_id);
    },
    setLineTier(state, action: PayloadAction<{ product_id: number; tier: 'retail' | 'wholesale' }>) {
      const item = state.cartItems.find(
        (c) => c.product_id === action.payload.product_id && c.price_tier !== action.payload.tier,
      );
      if (!item || item.is_service) return;
      item.price_tier = action.payload.tier;
      item.unit_price = action.payload.tier === 'wholesale' && item._wholesale_price != null
        ? item._wholesale_price
        : item.retail_price;
    },
    setLineDiscount(state, action: PayloadAction<{ product_id: number; discountAmount: number }>) {
      const item = state.cartItems.find((c) => c.product_id === action.payload.product_id);
      if (item) {
        item.discount_amount = Math.max(0, action.payload.discountAmount);
      }
    },
    /** Charge every cart line at wholesale where the product has a wholesale price. */
    setAllLinesWholesale(state) {
      state.cartItems.forEach((c) => {
        if (c.is_service) return;
        if (c.price_tier === 'wholesale') return;
        if (c._wholesale_price == null) return;
        c.price_tier = 'wholesale';
        c.unit_price = c._wholesale_price;
      });
    },
    /** Reset every wholesale line back to its retail price. */
    setAllLinesRetail(state) {
      state.cartItems.forEach((c) => {
        if (c.is_service) return;
        if (c.price_tier === 'retail') return;
        c.price_tier = 'retail';
        c.unit_price = c.retail_price;
      });
    },
    clearCart(state) {
      state.cartItems = [];
      state.discountAmount = 0;
      state.customerId = null;
      state.notes = '';
      state.amountTendered = 0;
      state.activeOrderId = null;
      state.activeOrderMode = null;
    },
    setPaymentMethod(state, action: PayloadAction<SalesState['paymentMethod']>) {
      state.paymentMethod = action.payload;
    },
    setCustomer(state, action: PayloadAction<number | null>) {
      state.customerId = action.payload;
    },
    setDiscount(state, action: PayloadAction<number>) {
      state.discountAmount = Math.max(0, action.payload);
    },
    setDiscountType(state, action: PayloadAction<'percentage' | 'fixed'>) {
      state.discountType = action.payload;
      state.discountAmount = 0;
    },
    setNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },
    setAmountTendered(state, action: PayloadAction<number>) {
      state.amountTendered = action.payload;
    },
    setActiveOrderId(state, action: PayloadAction<number | null>) {
      state.activeOrderId = action.payload;
      if (action.payload == null) state.activeOrderMode = null;
    },
    /** Resume open order to complete a sale (keeps order open until checkout). */
    resumeOrderToCart(state, action: PayloadAction<Omit<LoadOrderPayload, 'mode'> & { mode?: 'sale' }>) {
      state.cartItems = action.payload.items;
      state.customerId = action.payload.customerId;
      state.notes = action.payload.notes ?? '';
      state.discountAmount = action.payload.discountAmount ?? 0;
      state.amountTendered = 0;
      state.activeOrderId = action.payload.orderId;
      state.activeOrderMode = 'sale';
    },
    /** Explicit Update from Orders / Take - cart edits save via Update Order only. */
    loadOrderForUpdate(state, action: PayloadAction<Omit<LoadOrderPayload, 'mode'>>) {
      state.cartItems = action.payload.items;
      state.customerId = action.payload.customerId;
      state.notes = action.payload.notes ?? '';
      state.discountAmount = action.payload.discountAmount ?? 0;
      state.amountTendered = 0;
      state.activeOrderId = action.payload.orderId;
      state.activeOrderMode = 'update';
    },
    resetSales(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  addToCart, updateQuantity, removeFromCart, clearCart,
  setPaymentMethod, setCustomer, setDiscount, setDiscountType, setNotes, setAmountTendered,
  setActiveOrderId, resumeOrderToCart, loadOrderForUpdate, resetSales,
  setLineTier, setLineDiscount, setAllLinesWholesale, setAllLinesRetail,
} = salesSlice.actions;

export default salesSlice.reducer;

export const selectCartItems = (state: { sales: SalesState }) => state.sales.cartItems;
export const selectCartTotal = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
export const selectCartCount = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.quantity, 0);
export const selectActiveOrderId = (state: { sales: SalesState }) => state.sales.activeOrderId;
export const selectActiveOrderMode = (state: { sales: SalesState }) => state.sales.activeOrderMode;
