import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SalesState, HeldOrder } from './salesTypes';

const EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 hours

function loadHeldOrders(): HeldOrder[] {
  try {
    const orders: HeldOrder[] = JSON.parse(localStorage.getItem('heldOrders') || '[]');
    const now = Date.now();
    const active = orders.filter((o) => now - o.timestamp < EXPIRY_MS);
    if (active.length !== orders.length) saveHeldOrders(active);
    return active;
  } catch { return []; }
}

function saveHeldOrders(orders: HeldOrder[]) {
  try { localStorage.setItem('heldOrders', JSON.stringify(orders)); } catch { /* noop */ }
}

const initialState: SalesState = {
  cartItems: [],
  paymentMethod: 'cash',
  customerId: null,
  discountAmount: 0,
  discountType: 'percentage',
  notes: '',
  amountTendered: 0,
  heldOrders: loadHeldOrders(),
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
      state.amountTendered = 0;
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
    holdOrder(state, action: PayloadAction<{ notes?: string; customerName?: string } | undefined>) {
      if (state.cartItems.length === 0) return;
      const payload = action.payload || {};
      const order: HeldOrder = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        customerName: payload.customerName || 'Guest',
        items: [...state.cartItems],
        paymentMethod: state.paymentMethod,
        amountTendered: state.amountTendered,
        customerId: state.customerId,
        itemCount: state.cartItems.reduce((s, c) => s + c.quantity, 0),
        total: state.cartItems.reduce((s, c) => s + c.unit_price * c.quantity, 0),
        notes: payload.notes || '',
      };
      state.heldOrders = [order, ...state.heldOrders];
      saveHeldOrders(state.heldOrders);
      state.cartItems = [];
      state.amountTendered = 0;
      state.customerId = null;
    },
    takeOrder(state, action: PayloadAction<string>) {
      const idx = state.heldOrders.findIndex((o) => o.id === action.payload);
      if (idx === -1) return;
      const order = state.heldOrders[idx];
      state.cartItems = order.items;
      state.paymentMethod = order.paymentMethod;
      state.amountTendered = order.amountTendered;
      state.customerId = order.customerId;
      state.heldOrders.splice(idx, 1);
      saveHeldOrders(state.heldOrders);
    },
    removeHeldOrder(state, action: PayloadAction<string>) {
      state.heldOrders = state.heldOrders.filter((o) => o.id !== action.payload);
      saveHeldOrders(state.heldOrders);
    },
    renameHeldOrder(state, action: PayloadAction<{ id: string; name?: string; notes?: string }>) {
      const order = state.heldOrders.find((o) => o.id === action.payload.id);
      if (order) {
        if (action.payload.name !== undefined) order.customerName = action.payload.name || 'Guest';
        if (action.payload.notes !== undefined) order.notes = action.payload.notes;
        saveHeldOrders(state.heldOrders);
      }
    },
    resetSales(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  addToCart, updateQuantity, removeFromCart, clearCart,
  setPaymentMethod, setCustomer, setDiscount, setDiscountType, setNotes, setAmountTendered,
  holdOrder, takeOrder, removeHeldOrder, renameHeldOrder, resetSales,
} = salesSlice.actions;

export default salesSlice.reducer;

export const selectCartItems = (state: { sales: SalesState }) => state.sales.cartItems;
export const selectCartTotal = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
export const selectCartCount = (state: { sales: SalesState }) =>
  state.sales.cartItems.reduce((sum, c) => sum + c.quantity, 0);
