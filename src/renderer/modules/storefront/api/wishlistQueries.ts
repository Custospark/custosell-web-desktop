import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import { storefrontKeys } from './storefrontQueryKeys';
import type { WishlistItem } from './wishlistTypes';

function unwrapList<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T[] }).data;
  }
  return [];
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

export function useAddToWishlist() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (productId: number) => {
      const { data } = await axiosInstance.post(STOREFRONT.WISHLIST, { product_id: productId });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlist() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() });
      showToast('success', 'Saved to wishlist');
    },
    onError: () => {
      showToast('error', 'Could not save. Check your connection and try again.');
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlist() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() });
      showToast('success', 'Removed from wishlist');
    },
    onError: () => {
      showToast('error', 'Could not remove. Try again.');
    },
  });
}
