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

function patchWishlistCount(qc: ReturnType<typeof useQueryClient>, next: number) {
  qc.setQueryData(storefrontKeys.wishlistCount(), Math.max(0, next));
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

/** Optimistically drop products from wishlist cache (place-order / move-to-cart). */
export function optimisticallyRemoveWishlistProducts(
  qc: ReturnType<typeof useQueryClient>,
  productIds: number[],
) {
  const idSet = new Set(productIds);
  const prev = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist());
  if (prev) {
    const items = prev.items.filter((w) => !idSet.has(w.product_id));
    qc.setQueryData(storefrontKeys.wishlist(), { items, count: items.length });
    patchWishlistCount(qc, items.length);
  } else {
    const count = qc.getQueryData<number>(storefrontKeys.wishlistCount());
    if (typeof count === 'number') {
      patchWishlistCount(qc, Math.max(0, count - productIds.length));
    }
  }
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (input: { productId: number; product?: StorefrontProduct }) => {
      const { data } = await axiosInstance.post(STOREFRONT.WISHLIST, {
        product_id: input.productId,
      });
      return data as { data?: WishlistItem; message?: string };
    },
    onMutate: async ({ productId, product }) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlist() });
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlistCount() });
      const prevList = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist());
      const prevCount = qc.getQueryData<number>(storefrontKeys.wishlistCount());
      if (prevList && !prevList.items.some((w) => w.product_id === productId)) {
        const optimistic: WishlistItem = {
          id: -Date.now(),
          product_id: productId,
          created_at: new Date().toISOString(),
          product: product ?? null,
        };
        const items = [optimistic, ...prevList.items];
        qc.setQueryData(storefrontKeys.wishlist(), { items, count: items.length });
        patchWishlistCount(qc, items.length);
      } else if (!prevList && typeof prevCount === 'number') {
        patchWishlistCount(qc, prevCount + 1);
      }
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) qc.setQueryData(storefrontKeys.wishlist(), ctx.prevList);
      if (typeof ctx?.prevCount === 'number') patchWishlistCount(qc, ctx.prevCount);
      showToast('error', 'Could not save. Check your connection and try again.');
    },
    onSuccess: () => {
      showToast('success', 'Saved to wishlist');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlist() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (wishlistId: number) => {
      await axiosInstance.delete(STOREFRONT.WISHLIST_ITEM(wishlistId));
    },
    onMutate: async (wishlistId) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlist() });
      await qc.cancelQueries({ queryKey: storefrontKeys.wishlistCount() });
      const prevList = qc.getQueryData<WishlistCache>(storefrontKeys.wishlist());
      const prevCount = qc.getQueryData<number>(storefrontKeys.wishlistCount());
      if (prevList) {
        const items = prevList.items.filter((w) => w.id !== wishlistId);
        qc.setQueryData(storefrontKeys.wishlist(), { items, count: items.length });
        patchWishlistCount(qc, items.length);
      } else if (typeof prevCount === 'number') {
        patchWishlistCount(qc, prevCount - 1);
      }
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) qc.setQueryData(storefrontKeys.wishlist(), ctx.prevList);
      if (typeof ctx?.prevCount === 'number') patchWishlistCount(qc, ctx.prevCount);
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
