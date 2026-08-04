import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import { storefrontKeys } from './storefrontQueryKeys';
import type { StorefrontShop } from './storefrontTypes';
import type { FavoriteItem, FavoritesCache } from './favoriteTypes';

function unwrapList<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function emptyFavorites(): FavoritesCache {
  return { items: [], count: 0 };
}

function patchFavoritesCount(qc: ReturnType<typeof useQueryClient>, next: number) {
  qc.setQueryData(storefrontKeys.favoritesCount(), Math.max(0, next));
}

function syncFavoritesCaches(qc: ReturnType<typeof useQueryClient>, next: FavoritesCache) {
  qc.setQueryData(storefrontKeys.favorites(), next);
  patchFavoritesCount(qc, next.count);
}

function parseFavoriteItem(payload: unknown): FavoriteItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { data?: unknown };
  const raw = (root.data && typeof root.data === 'object' ? root.data : payload) as Partial<FavoriteItem>;
  if (typeof raw.id !== 'number' || !raw.business || typeof raw.business !== 'object') return null;
  return { id: raw.id, business: raw.business as StorefrontShop };
}

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: storefrontKeys.favorites(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.FAVORITES);
      return {
        items: unwrapList<FavoriteItem>(data),
        count: (data as { count?: number }).count ?? 0,
      };
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useFavoritesCount(enabled = true) {
  return useQuery({
    queryKey: storefrontKeys.favoritesCount(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.FAVORITES);
      return (data as { count?: number }).count ?? 0;
    },
    enabled,
    staleTime: 30_000,
  });
}

/** Is a given business currently favored? Convenience for heart toggles. */
export function useIsFavorited(enabled: boolean, businessId?: number) {
  const { data } = useFavorites(enabled);
  if (!businessId) return false;
  return Boolean(data?.items?.some((f) => f.business?.id === businessId));
}

export function useAddToFavorites() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (input: { businessId: number; business: StorefrontShop }) => {
      const { data } = await axiosInstance.post(STOREFRONT.FAVORITES, {
        business_id: input.businessId,
      });
      return data;
    },
    onMutate: async ({ businessId, business }) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.favorites() });
      await qc.cancelQueries({ queryKey: storefrontKeys.favoritesCount() });
      const prevList = qc.getQueryData<FavoritesCache>(storefrontKeys.favorites());
      const prevCount = qc.getQueryData<number>(storefrontKeys.favoritesCount());
      const base = prevList ?? emptyFavorites();
      if (!base.items.some((f) => f.business?.id === businessId)) {
        const optimistic: FavoriteItem = { id: -businessId, business };
        syncFavoritesCaches(qc, {
          items: [optimistic, ...base.items],
          count: base.items.length + 1,
        });
      } else {
        syncFavoritesCaches(qc, { items: base.items, count: base.items.length });
      }
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) syncFavoritesCaches(qc, ctx.prevList);
      else if (typeof ctx?.prevCount === 'number') patchFavoritesCount(qc, ctx.prevCount);
      showToast('error', 'Could not favorite. Check your connection and try again.');
    },
    onSuccess: (data, { businessId, business }) => {
      const serverItem = parseFavoriteItem(data);
      const prev = qc.getQueryData<FavoritesCache>(storefrontKeys.favorites()) ?? emptyFavorites();
      const withoutTemp = prev.items.filter((f) => f.business?.id !== businessId);
      const nextItem: FavoriteItem = serverItem
        ? serverItem
        : { id: -businessId, business };
      syncFavoritesCaches(qc, {
        items: [nextItem, ...withoutTemp],
        count: withoutTemp.length + 1,
      });
      showToast('success', 'Added to favorites');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.favorites() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.favoritesCount() });
    },
  });
}

export function useRemoveFromFavorites() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (businessId: number) => {
      await axiosInstance.delete(STOREFRONT.FAVORITE_BUSINESS(businessId));
    },
    onMutate: async (businessId) => {
      await qc.cancelQueries({ queryKey: storefrontKeys.favorites() });
      await qc.cancelQueries({ queryKey: storefrontKeys.favoritesCount() });
      const prevList = qc.getQueryData<FavoritesCache>(storefrontKeys.favorites());
      const prevCount = qc.getQueryData<number>(storefrontKeys.favoritesCount());
      const base = prevList ?? emptyFavorites();
      const items = base.items.filter((f) => f.business?.id !== businessId);
      syncFavoritesCaches(qc, { items, count: items.length });
      return { prevList, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) syncFavoritesCaches(qc, ctx.prevList);
      else if (typeof ctx?.prevCount === 'number') patchFavoritesCount(qc, ctx.prevCount);
      showToast('error', 'Could not remove. Try again.');
    },
    onSuccess: () => {
      showToast('success', 'Removed from favorites');
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: storefrontKeys.favorites() });
      void qc.invalidateQueries({ queryKey: storefrontKeys.favoritesCount() });
    },
  });
}