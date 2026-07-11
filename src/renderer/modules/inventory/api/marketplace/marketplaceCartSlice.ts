import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { logout } from '../../../../app/store/slices/authSlice';
import type {
  MarketplaceBusiness,
  MarketplaceCartLine,
  MarketplaceProduct,
} from './marketplaceTypes';

export interface MarketplaceCartState {
  lines: MarketplaceCartLine[];
  notes: string;
  /** Last supplier the buyer was browsing (restored when returning to Marketplace). */
  selectedSupplier: MarketplaceBusiness | null;
  /** Keep dock/sheet preference across route changes within the session. */
  cartOpen: boolean;
}

const initialState: MarketplaceCartState = {
  lines: [],
  notes: '',
  selectedSupplier: null,
  cartOpen: false,
};

const marketplaceCartSlice = createSlice({
  name: 'marketplaceCart',
  initialState,
  reducers: {
    addMarketplaceCartLine(state, action: PayloadAction<MarketplaceProduct>) {
      const product = action.payload;
      const sellerId = state.lines[0]?.product.business_id;
      if (sellerId != null && sellerId !== product.business_id) {
        state.lines = [{ product, quantity: Math.max(1, product.supply_min_qty ?? 1) }];
        state.cartOpen = true;
        return;
      }
      const existing = state.lines.find((l) => l.product.id === product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.lines.push({
          product,
          quantity: Math.max(1, product.supply_min_qty ?? 1),
        });
      }
      state.cartOpen = true;
    },
    updateMarketplaceCartQty(
      state,
      action: PayloadAction<{ productId: number; quantity: number }>,
    ) {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.lines = state.lines.filter((l) => l.product.id !== productId);
        return;
      }
      const line = state.lines.find((l) => l.product.id === productId);
      if (line) line.quantity = quantity;
    },
    removeMarketplaceCartLine(state, action: PayloadAction<number>) {
      state.lines = state.lines.filter((l) => l.product.id !== action.payload);
    },
    setMarketplaceCartNotes(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },
    setMarketplaceSelectedSupplier(state, action: PayloadAction<MarketplaceBusiness | null>) {
      state.selectedSupplier = action.payload;
      const cartSeller = state.lines[0]?.product.business_id;
      if (
        action.payload
        && cartSeller != null
        && cartSeller !== action.payload.id
      ) {
        state.lines = [];
        state.notes = '';
      }
    },
    setMarketplaceCartOpen(state, action: PayloadAction<boolean>) {
      state.cartOpen = action.payload;
    },
    clearMarketplaceCart(state) {
      state.lines = [];
      state.notes = '';
      state.cartOpen = false;
    },
    resetMarketplaceCart() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const {
  addMarketplaceCartLine,
  updateMarketplaceCartQty,
  removeMarketplaceCartLine,
  setMarketplaceCartNotes,
  setMarketplaceSelectedSupplier,
  setMarketplaceCartOpen,
  clearMarketplaceCart,
  resetMarketplaceCart,
} = marketplaceCartSlice.actions;

export default marketplaceCartSlice.reducer;

type MarketplaceCartRoot = { marketplaceCart: MarketplaceCartState };

export const selectMarketplaceCartLines = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.lines;
export const selectMarketplaceCartNotes = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.notes;
export const selectMarketplaceSelectedSupplier = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.selectedSupplier;
export const selectMarketplaceCartOpen = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.cartOpen;
export const selectMarketplaceCartLineCount = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.lines.length;
export const selectMarketplaceCartSellerId = (state: MarketplaceCartRoot) =>
  state.marketplaceCart.lines[0]?.product.business_id ?? null;
