import type { CartItem, SalesState } from './salesTypes';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const initialState: SalesState = {
  cartItems: [],
  paymentMethod: 'cash',
  customerId: null,
  discountAmount: 0,
  discountType: 'percentage',
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
      unit?: string | null;
      tax_percentage?: number | string | null;
      tax_class?: string | null;
    }>) {
      const existing = state.cartItems.find((c) => c.product_id === action.payload.product_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({
          product_id: action.payload.product_id,
          name: action.payload.name,
          unit_price: action.payload.unit_price,
          unit: action.payload.unit,
          tax_percentage: action.payload.tax_percentage ?? null,
          tax_class: action.payload.tax_class ?? 'standard',
          quantity: 1,
          discount_amount: 0,
        });
      }
    },
    updateQuantity(state, action: PayloadAction<{ product_id: number; quantity: number }>) {
      const { product_id, quantity } = action.payload;
      if (quantity <= 0) {
        state.cartItems = state.cartItems.filter((c) => c.product_id !== product_id);
      } else {
        const item = state.cartItems.find((c) => c.product_id === product_id);
        if (item) item.quantity = quantity;
      }
    },
    removeFromCart(state, action: PayloadAction<number>) {
      state.cartItems = state.cartItems.filter((c) => c.product_id !== action.payload);
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
    /** Explicit Update from Orders / Take — cart edits save via Update Order only. */
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
} = salesSlice.actions;

export default salesSlice.reducer;

export const selectCartItems = (state: { sales: SalesState }) => state.sales.cartItems;
export const selectCartTotal = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
export const selectCartCount = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.quantity, 0);
export const selectActiveOrderId = (state: { sales: SalesState }) => state.sales.activeOrderId;
export const selectActiveOrderMode = (state: { sales: SalesState }) => state.sales.activeOrderMode;
