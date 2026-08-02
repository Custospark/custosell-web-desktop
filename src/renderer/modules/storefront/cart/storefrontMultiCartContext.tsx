import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import type { StorefrontProduct } from '../api/storefrontTypes';
import {
  addProduct,
  clearBag,
  ensureBag,
  openCart,
  removeLine,
  selectStorefrontActiveSlug,
  selectStorefrontBags,
  selectStorefrontCartOpen,
  selectStorefrontCarts,
  selectStorefrontLineCount,
  setActiveSlug,
  setBagContact,
  setCartOpen,
  updateQty,
} from './storefrontCartSlice';
import { saveBuyerContact } from './storefrontBuyerContactStorage';
import type {
  StorefrontBagContactPatch,
  StorefrontCartBag,
  StorefrontCartShopMeta,
} from './storefrontCartTypes';

type StorefrontActions = {
  setCartOpen: (open: boolean) => void;
  openCart: (slug?: string | null) => void;
  setActiveSlug: (slug: string | null) => void;
  ensureBag: (shop: StorefrontCartShopMeta) => void;
  addProduct: (shop: StorefrontCartShopMeta, product: StorefrontProduct) => void;
  updateQty: (slug: string, productId: number, quantity: number) => void;
  removeLine: (slug: string, productId: number) => void;
  setBagContact: (slug: string, patch: StorefrontBagContactPatch) => void;
  clearBag: (slug: string) => void;
};

type MultiCartValue = StorefrontActions & {
  carts: ReturnType<typeof selectStorefrontCarts>;
  cartOpen: boolean;
  activeSlug: string | null;
  lineCount: number;
  bags: StorefrontCartBag[];
  getBag: (slug: string) => StorefrontCartBag | null;
};

/**
 * Stable dispatchers only — no state subscription. Use this in high-volume
 * screens (product grids) that only need to add/remove so they never re-render
 * just because the cart changed.
 */
export function useStorefrontCartActions(): StorefrontActions {
  const dispatch = useAppDispatch();

  const handleSetCartOpen = useCallback((open: boolean) => dispatch(setCartOpen(open)), [dispatch]);
  const handleSetActiveSlug = useCallback((slug: string | null) => dispatch(setActiveSlug(slug)), [dispatch]);
  const handleOpenCart = useCallback((slug?: string | null) => dispatch(openCart(slug ?? null)), [dispatch]);
  const handleEnsureBag = useCallback(
    (shop: StorefrontCartShopMeta) => dispatch(ensureBag(shop)),
    [dispatch],
  );
  const handleAddProduct = useCallback(
    (shop: StorefrontCartShopMeta, product: StorefrontProduct) => dispatch(addProduct({ shop, product })),
    [dispatch],
  );
  const handleUpdateQty = useCallback(
    (slug: string, productId: number, quantity: number) => dispatch(updateQty({ slug, productId, quantity })),
    [dispatch],
  );
  const handleRemoveLine = useCallback(
    (slug: string, productId: number) => dispatch(removeLine({ slug, productId })),
    [dispatch],
  );
  const handleSetBagContact = useCallback(
    (slug: string, patch: StorefrontBagContactPatch) => {
      dispatch(setBagContact({ slug, patch }));
      saveBuyerContact(patch);
    },
    [dispatch],
  );
  const handleClearBag = useCallback((slug: string) => dispatch(clearBag(slug)), [dispatch]);

  return {
    setCartOpen: handleSetCartOpen,
    setActiveSlug: handleSetActiveSlug,
    openCart: handleOpenCart,
    ensureBag: handleEnsureBag,
    addProduct: handleAddProduct,
    updateQty: handleUpdateQty,
    removeLine: handleRemoveLine,
    setBagContact: handleSetBagContact,
    clearBag: handleClearBag,
  };
}

export function useStorefrontMultiCart(): MultiCartValue {
  const actions = useStorefrontCartActions();
  const carts = useAppSelector(selectStorefrontCarts);
  const cartOpen = useAppSelector(selectStorefrontCartOpen);
  const activeSlug = useAppSelector(selectStorefrontActiveSlug);
  const bags = useAppSelector(selectStorefrontBags);
  const lineCount = useAppSelector(selectStorefrontLineCount);

  const getBag = useCallback((slug: string) => carts[slug] ?? null, [carts]);

  return {
    ...actions,
    carts,
    cartOpen,
    activeSlug,
    lineCount,
    bags,
    getBag,
  };
}