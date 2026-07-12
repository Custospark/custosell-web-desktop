import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StorefrontCartItem, StorefrontProduct } from '../api/storefrontTypes';
import { loadStorefrontCarts, saveStorefrontCarts } from './storefrontCartStorage';
import {
  emptyBag,
  totalLineCount,
  type StorefrontCartBag,
  type StorefrontCartShopMeta,
  type StorefrontCartsBySlug,
} from './storefrontCartTypes';

type MultiCartValue = {
  carts: StorefrontCartsBySlug;
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
  setBagContact: (
    slug: string,
    patch: Partial<Pick<StorefrontCartBag, 'customer_name' | 'customer_phone' | 'notes'>>,
  ) => void;
  clearBag: (slug: string) => void;
  getBag: (slug: string) => StorefrontCartBag | null;
};

const StorefrontMultiCartContext = createContext<MultiCartValue | null>(null);

function upsertItem(items: StorefrontCartItem[], product: StorefrontProduct): StorefrontCartItem[] {
  const existing = items.find((l) => l.product.id === product.id);
  if (existing) {
    return items.map((l) => (
      l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
    ));
  }
  return [...items, { product, quantity: 1 }];
}

export function StorefrontMultiCartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<StorefrontCartsBySlug>(() => loadStorefrontCarts());
  const [cartOpen, setCartOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    saveStorefrontCarts(carts);
  }, [carts]);

  const bags = useMemo(
    () => Object.values(carts).filter((b) => b.items.length > 0),
    [carts],
  );
  const lineCount = useMemo(() => totalLineCount(carts), [carts]);

  const openCart = useCallback((slug?: string | null) => {
    if (slug) setActiveSlug(slug);
    setCartOpen(true);
  }, []);

  const ensureBag = useCallback((shop: StorefrontCartShopMeta) => {
    setCarts((prev) => {
      if (prev[shop.slug]) {
        return {
          ...prev,
          [shop.slug]: { ...prev[shop.slug], shop },
        };
      }
      return { ...prev, [shop.slug]: emptyBag(shop) };
    });
  }, []);

  const addProduct = useCallback((shop: StorefrontCartShopMeta, product: StorefrontProduct) => {
    setCarts((prev) => {
      const current = prev[shop.slug] ?? emptyBag(shop);
      return {
        ...prev,
        [shop.slug]: {
          ...current,
          shop,
          items: upsertItem(current.items, product),
        },
      };
    });
    setActiveSlug(shop.slug);
    setCartOpen(true);
  }, []);

  const updateQty = useCallback((slug: string, productId: number, quantity: number) => {
    setCarts((prev) => {
      const bag = prev[slug];
      if (!bag) return prev;
      const items = bag.items
        .map((l) => (l.product.id === productId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0);
      if (items.length === 0) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: { ...bag, items } };
    });
  }, []);

  const removeLine = useCallback((slug: string, productId: number) => {
    setCarts((prev) => {
      const bag = prev[slug];
      if (!bag) return prev;
      const items = bag.items.filter((l) => l.product.id !== productId);
      if (items.length === 0) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }
      return { ...prev, [slug]: { ...bag, items } };
    });
  }, []);

  const setBagContact = useCallback((
    slug: string,
    patch: Partial<Pick<StorefrontCartBag, 'customer_name' | 'customer_phone' | 'notes'>>,
  ) => {
    setCarts((prev) => {
      const bag = prev[slug];
      if (!bag) return prev;
      return { ...prev, [slug]: { ...bag, ...patch } };
    });
  }, []);

  const clearBag = useCallback((slug: string) => {
    setCarts((prev) => {
      if (!prev[slug]) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);

  const getBag = useCallback((slug: string) => carts[slug] ?? null, [carts]);

  const value = useMemo<MultiCartValue>(
    () => ({
      carts,
      cartOpen,
      activeSlug,
      lineCount,
      bags,
      setCartOpen,
      openCart,
      setActiveSlug,
      ensureBag,
      addProduct,
      updateQty,
      removeLine,
      setBagContact,
      clearBag,
      getBag,
    }),
    [
      carts,
      cartOpen,
      activeSlug,
      lineCount,
      bags,
      openCart,
      ensureBag,
      addProduct,
      updateQty,
      removeLine,
      setBagContact,
      clearBag,
      getBag,
    ],
  );

  return (
    <StorefrontMultiCartContext.Provider value={value}>
      {children}
    </StorefrontMultiCartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook must live with provider
export function useStorefrontMultiCart(): MultiCartValue {
  const ctx = useContext(StorefrontMultiCartContext);
  if (!ctx) {
    throw new Error('useStorefrontMultiCart must be used within DiscoverLayout');
  }
  return ctx;
}
