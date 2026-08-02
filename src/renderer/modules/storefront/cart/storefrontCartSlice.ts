import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { logout } from '../../../app/store/slices/authSlice';
import type { StorefrontCartItem, StorefrontProduct } from '../api/storefrontTypes';
import {
  emptyBag,
  type StorefrontBagContactPatch,
  type StorefrontCartBag,
  type StorefrontCartShopMeta,
  type StorefrontCartsBySlug,
} from './storefrontCartTypes';

export interface StorefrontCartState {
  /** Per-shop bags keyed by shop slug. */
  carts: StorefrontCartsBySlug;
  cartOpen: boolean;
  activeSlug: string | null;
}

const initialState: StorefrontCartState = {
  carts: {},
  cartOpen: false,
  activeSlug: null,
};

function upsertItem(items: StorefrontCartItem[], product: StorefrontProduct): StorefrontCartItem[] {
  const existing = items.find((l) => l.product.id === product.id);
  if (existing) {
    return items.map((l) => (
      l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
    ));
  }
  return [...items, { product, quantity: 1 }];
}

const storefrontCartSlice = createSlice({
  name: 'storefrontCart',
  initialState,
  reducers: {
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.cartOpen = action.payload;
    },
    setActiveSlug(state, action: PayloadAction<string | null>) {
      state.activeSlug = action.payload;
    },
    openCart(state, action: PayloadAction<string | null | undefined>) {
      if (action.payload) state.activeSlug = action.payload;
      state.cartOpen = true;
    },
    ensureBag(state, action: PayloadAction<StorefrontCartShopMeta>) {
      const shop = action.payload;
      if (!state.carts[shop.slug]) {
        state.carts[shop.slug] = emptyBag(shop);
      }
    },
    addProduct(state, action: PayloadAction<{ shop: StorefrontCartShopMeta; product: StorefrontProduct }>) {
      const { shop, product } = action.payload;
      const current = state.carts[shop.slug] ?? emptyBag(shop);
      state.carts[shop.slug] = {
        ...state.carts[shop.slug],
        shop,
        items: upsertItem(current.items, product),
      };
    },
    updateQty(state, action: PayloadAction<{ slug: string; productId: number; quantity: number }>) {
      const { slug, productId, quantity } = action.payload;
      const bag = state.carts[slug];
      if (!bag) return;
      const items = bag.items
        .map((l) => (l.product.id === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0);
      if (items.length === 0) {
        delete state.carts[slug];
        return;
      }
      state.carts[slug] = { ...bag, items };
    },
    removeLine(state, action: PayloadAction<{ slug: string; productId: number }>) {
      const { slug, productId } = action.payload;
      const bag = state.carts[slug];
      if (!bag) return;
      const items = bag.items.filter((l) => l.product.id !== productId);
      if (items.length === 0) {
        delete state.carts[slug];
        return;
      }
      state.carts[slug] = { ...bag, items };
    },
    setBagContact(state, action: PayloadAction<{ slug: string; patch: StorefrontBagContactPatch }>) {
      const { slug, patch } = action.payload;
      const bag = state.carts[slug];
      if (!bag) return;
      state.carts[slug] = { ...bag, ...patch };
    },
    clearBag(state, action: PayloadAction<string>) {
      delete state.carts[action.payload];
    },
    resetStorefrontCart() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const {
  setCartOpen,
  setActiveSlug,
  openCart,
  ensureBag,
  addProduct,
  updateQty,
  removeLine,
  setBagContact,
  clearBag,
  resetStorefrontCart,
} = storefrontCartSlice.actions;

export default storefrontCartSlice.reducer;

type StorefrontCartRoot = { storefrontCart: StorefrontCartState };

export const selectStorefrontCartOpen = (state: StorefrontCartRoot) => state.storefrontCart.cartOpen;
export const selectStorefrontActiveSlug = (state: StorefrontCartRoot) => state.storefrontCart.activeSlug;
export const selectStorefrontCarts = (state: StorefrontCartRoot) => state.storefrontCart.carts;
export const selectStorefrontBags = (state: StorefrontCartRoot): StorefrontCartBag[] =>
  Object.values(state.storefrontCart.carts).filter((b) => b.items.length > 0);
export const selectStorefrontLineCount = (state: StorefrontCartRoot): number =>
  Object.values(state.storefrontCart.carts).reduce(
    (sum, bag) => sum + bag.items.length,
    0,
  );
export const selectStorefrontBagBySlug =
  (slug: string) =>
  (state: StorefrontCartRoot): StorefrontCartBag | null =>
    state.storefrontCart.carts[slug] ?? null;