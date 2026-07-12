import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import type { StorefrontProduct } from './storefrontTypes';
import { storefrontKeys } from './storefrontQueryKeys';
import type { WishlistItem } from './wishlistTypes';

type WishlistCache = { items: WishlistItem[]; count: number };

function unwrapList<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function emptyWishlist(): WishlistCache {
  return { items: [], count: 0 };
}

function patchWishlistCount(qc: ReturnType<typeof useQueryClient>, next: number) {
  qc.setQueryData(storefrontKeys.wishlistCount(), Math.max(0, next));
}

function syncWishlistCaches(qc: ReturnType<typeof useQueryClient>, next: WishlistCache) {
  qc.setQueryData(storefrontKeys.wishlist(), next);
  patchWishlistCount(qc, next.count);
}

function parseWishlistItem(payload: unknown): WishlistItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { data?: unknown };
  const raw = (root.data && typeof root.data === 'object' ? root.data : payload) as Partial<WishlistItem>;
  if (typeof raw.id !== 'number' || typeof raw.product_id !== 'number') return null;
  return {
    id: raw.id,
    product_id: raw.product_id,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    product: raw.product ?? null,
  };
}

export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: storefrontKeys.wishlist(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.WISHLIST);
      return {
        items: unwrapList<WishlistItem>(data),
        count: (data as { count?: number }).count ?? 0,
      };
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useWishlistCount(enabled = true) {
  return useQuery({
    queryKey: storefrontKeys.wishlistCount(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.WISHLIST);
      return (data as { count?: number }).count ?? 0;
    },
    enabled,
    staleTime: 30_000,
  });
}

/** Drop products from wishlist cache after a successful place-order. */
export function optimisticallyRemoveWishlistProducts(
  qc: ReturnType<typeof useQueryClient>,
  productIds: number[],
) {
  const idSet = new Set(productIds);
  const prev = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist()) ?? emptyWishlist();
  const items = prev.items.filter((w) => !idSet.has(w.product_id));
  syncWishlistCaches(qc, { items, count: items.length });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (input: { productId: number; product?: StorefrontProduct }) => {
      const { data } = await axiosInstance.post(STOREFRONT.WISHLIST, {
        product_id: input.productId,
      });
      return data;
    },
    onMutate: async ({ productId, product }) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlist() });
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlistCount() });
      const prevList = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist());
      const prevCount = qc.getQueryData<number>(storefrontKeys.wishlistCount());
      const base = prevList ?? emptyWishlist();
      if (!base.items.some((w) => w.product_id === productId)) {
        const optimistic: WishlistItem = {
          id: -productId,
          product_id: productId,
          created_at: new Date().toISOString(),
          product: product ?? null,
        };
        syncWishlistCaches(qc, {
          items: [optimistic, ...base.items],
          count: base.items.length + 1,
        });
      } else {
        syncWishlistCaches(qc, { items: base.items, count: base.items.length });
      }
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) syncWishlistCaches(qc, ctx.prevList);
      else if (typeof ctx?.prevCount === 'number') patchWishlistCount(qc, ctx.prevCount);
      showToast('error', 'Could not save. Check your connection and try again.');
    },
    onSuccess: (data, { productId, product }) => {
      const serverItem = parseWishlistItem(data);
      const prev = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist()) ?? emptyWishlist();
      const withoutTemp = prev.items.filter((w) => w.product_id !== productId);
      const nextItem: WishlistItem = serverItem
        ? {
            ...serverItem,
            product: serverItem.product ?? product ?? null,
          }
        : {
            id: -productId,
            product_id: productId,
            created_at: new Date().toISOString(),
            product: product ?? null,
          };
      syncWishlistCaches(qc, {
        items: [nextItem, ...withoutTemp],
        count: withoutTemp.length + 1,
      });
      showToast('success', 'Saved to wishlist');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlist() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() });
    },
  });
}

/** Remove by product_id so hearts never DELETE a temporary optimistic row id. */
export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (productId: number) => {
      await axiosInstance.delete(STOREFRONT.WISHLIST_BY_PRODUCT(productId));
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlist() });
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlistCount() });
      const prevList = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist());
      const prevCount = qc.getQueryData<number>(storefrontKeys.wishlistCount());
      const base = prevList ?? emptyWishlist();
      const items = base.items.filter((w) => w.product_id !== productId);
      syncWishlistCaches(qc, { items, count: items.length });
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) syncWishlistCaches(qc, ctx.prevList);
      else if (typeof ctx?.prevCount === 'number') patchWishlistCount(qc, ctx.prevCount);
      showToast('error', 'Could not remove. Try again.');
    },
    onSuccess: () => {
      showToast('success', 'Removed from wishlist');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlist() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() });
    },
  });
}
