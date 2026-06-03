import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SalesState } from './salesTypes';

const initialState: SalesState = {
  cartItems: [],
  paymentMethod: 'cash',
  customerId: null,
  discountAmount: 0,
  notes: '',
};

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ product_id: number; name: string; unit_price: number }>) {
      const existing = state.cartItems.find((c) => c.product_id === action.payload.product_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({
          product_id: action.payload.product_id,
          name: action.payload.name,
          unit_price: action.payload.unit_price,
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
    },
    setPaymentMethod(state, action: PayloadAction<SalesState['paymentMethod']>) {
      state.paymentMethod = action.payload;
    },
    setCustomer(state, action: PayloadAction<number | null>) {
      state.customerId = action.payload;
    },
    setDiscount(state, action: PayloadAction<number>) {
      state.discountAmount = action.payload;
    },
    setNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },
    resetSales(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  addToCart, updateQuantity, removeFromCart, clearCart,
  setPaymentMethod, setCustomer, setDiscount, setNotes, resetSales,
} = salesSlice.actions;

export default salesSlice.reducer;

export const selectCartItems = (state: { sales: SalesState }) => state.sales.cartItems;
export const selectCartTotal = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
export const selectCartCount = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.quantity, 0);
