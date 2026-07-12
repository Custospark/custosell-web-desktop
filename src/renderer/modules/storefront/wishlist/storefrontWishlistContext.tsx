import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import type { StorefrontProduct } from '../api/storefrontTypes';
import {
  loadWishlist,
  mergeWishlistLists,
  saveWishlist,
} from './storefrontWishlistStorage';
import {
  toWishlistItem,
  wishlistItemKey,
  type StorefrontWishlistItem,
} from './storefrontWishlistTypes';

type WishlistValue = {
  items: StorefrontWishlistItem[];
  count: number;
  isSaved: (shopSlug: string, productId: number) => boolean;
  toggle: (product: StorefrontProduct, shopSlug?: string) => boolean;
  remove: (shopSlug: string, productId: number) => void;
  clear: () => void;
};

const StorefrontWishlistContext = createContext<WishlistValue | null>(null);

function loadForOwner(ownerId: string | number | null): StorefrontWishlistItem[] {
  if (ownerId == null) return loadWishlist(null);
  const account = loadWishlist(ownerId);
  const guest = loadWishlist(null);
  const merged = mergeWishlistLists(account, guest);
  saveWishlist(ownerId, merged);
  if (guest.length > 0) saveWishlist(null, []);
  return merged;
}

function WishlistOwnerProvider({
  ownerId,
  children,
}: {
  ownerId: string | number | null;
  children: ReactNode;
}) {
  const [items, setItems] = useState<StorefrontWishlistItem[]>(() => loadForOwner(ownerId));

  useEffect(() => {
    saveWishlist(ownerId, items);
  }, [ownerId, items]);

  const isSaved = useCallback(
    (shopSlug: string, productId: number) => {
      const key = wishlistItemKey(shopSlug, productId);
      return items.some((i) => i.key === key);
    },
    [items],
  );

  const toggle = useCallback((product: StorefrontProduct, shopSlug?: string): boolean => {
    const nextItem = toWishlistItem(product, shopSlug);
    if (!nextItem) return false;
    const exists = items.some((i) => i.key === nextItem.key);
    if (exists) {
      setItems((prev) => prev.filter((i) => i.key !== nextItem.key));
      return false;
    }
    setItems((prev) => [nextItem, ...prev.filter((i) => i.key !== nextItem.key)]);
    return true;
  }, [items]);

  const remove = useCallback((shopSlug: string, productId: number) => {
    const key = wishlistItemKey(shopSlug, productId);
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<WishlistValue>(
    () => ({
      items,
      count: items.length,
      isSaved,
      toggle,
      remove,
      clear,
    }),
    [items, isSaved, toggle, remove, clear],
  );

  return (
    <StorefrontWishlistContext.Provider value={value}>
      {children}
    </StorefrontWishlistContext.Provider>
  );
}

/** Remounts on auth owner change so guest → account merge runs in useState init (no effect setState). */
export function StorefrontWishlistProvider({ children }: { children: ReactNode }) {
  const userId = useAppSelector((s) => s.auth.user?.id ?? null);
  return (
    <WishlistOwnerProvider key={userId ?? 'guest'} ownerId={userId}>
      {children}
    </WishlistOwnerProvider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook with provider
export function useStorefrontWishlist(): WishlistValue {
  const ctx = useContext(StorefrontWishlistContext);
  if (!ctx) {
    throw new Error('useStorefrontWishlist must be used within DiscoverLayout');
  }
  return ctx;
}
