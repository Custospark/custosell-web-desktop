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

type MultiCartValue = {
  carts: ReturnType<typeof selectStorefrontCarts>;
  cartOpen: boolean;
  activeSlug: string | null;
  lineCount: number;
  bags: StorefrontCartBag[];
  setCartOpen: (open: boolean) => void;
  openCart: (slug?: string | null) => void;
  setActiveSlug: (slug: string | null) => void;
  ensureBag: (shop: StorefrontCartShopMeta) => void;
  addProduct: (shop: StorefrontCartShopMeta, product: StorefrontProduct) => void;
  updateQty: (slug: string, productId: number, quantity: number) => void;
  removeLine: (slug: string, productId: number) => void;
  setBagContact: (slug: string, patch: StorefrontBagContactPatch) => void;
  clearBag: (slug: string) => void;
  getBag: (slug: string) => StorefrontCartBag | null;
};

export function useStorefrontMultiCart(): MultiCartValue {
  const dispatch = useAppDispatch();
  const carts = useAppSelector(selectStorefrontCarts);
  const cartOpen = useAppSelector(selectStorefrontCartOpen);
  const activeSlug = useAppSelector(selectStorefrontActiveSlug);
  const bags = useAppSelector(selectStorefrontBags);
  const lineCount = useAppSelector(selectStorefrontLineCount);

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
  const getBag = useCallback((slug: string) => carts[slug] ?? null, [carts]);

  return {
    carts,
    cartOpen,
    activeSlug,
    lineCount,
    bags,
    setCartOpen: handleSetCartOpen,
    setActiveSlug: handleSetActiveSlug,
    openCart: handleOpenCart,
    ensureBag: handleEnsureBag,
    addProduct: handleAddProduct,
    updateQty: handleUpdateQty,
    removeLine: handleRemoveLine,
    setBagContact: handleSetBagContact,
    clearBag: handleClearBag,
    getBag,
  };
}