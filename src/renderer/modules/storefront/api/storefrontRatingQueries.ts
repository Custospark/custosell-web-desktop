import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import { applyOptimisticRating } from './ratingOptimistic';
import { storefrontKeys } from './storefrontQueryKeys';
import type { StorefrontProduct, StorefrontShop } from './storefrontTypes';

type PageMeta = {
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number;
};

function mapProductsInInfinite(
  old: unknown,
  mapFn: (p: StorefrontProduct) => StorefrontProduct,
): unknown {
  if (!old || typeof old !== 'object' || !('pages' in old)) return old;
  const pages = (old as { pages: Array<{ products: StorefrontProduct[]; meta: PageMeta }> }).pages;
  return {
    ...(old as object),
    pages: pages.map((page) => ({
      ...page,
      products: page.products.map(mapFn),
    })),
  };
}

function mapProductsInShopList(
  old: unknown,
  mapFn: (p: StorefrontProduct) => StorefrontProduct,
): unknown {
  if (!old || typeof old !== 'object' || !('products' in old)) return old;
  const list = old as { products: StorefrontProduct[]; shop?: StorefrontShop };
  return { ...list, products: list.products.map(mapFn) };
}

function mapShopsInInfinite(
  old: unknown,
  mapFn: (s: StorefrontShop) => StorefrontShop,
): unknown {
  if (!old || typeof old !== 'object' || !('pages' in old)) return old;
  const pages = (old as { pages: Array<{ shops: StorefrontShop[]; meta: PageMeta }> }).pages;
  return {
    ...(old as object),
    pages: pages.map((page) => ({
      ...page,
      shops: page.shops.map(mapFn),
    })),
  };
}

function patchProductInInfinite(old: unknown, product: StorefrontProduct): unknown {
  return mapProductsInInfinite(old, (p) => (p.id === product.id ? { ...p, ...product } : p));
}

function patchProductInShopList(old: unknown, product: StorefrontProduct): unknown {
  return mapProductsInShopList(old, (p) => (p.id === product.id ? { ...p, ...product } : p));
}

/** One-tap 1–5 rating with optimistic cache patch. */
export function useRateStorefrontProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slug,
      productId,
      rating,
    }: {
      slug: string;
      productId: number;
      rating: number;
    }) => {
      const { data } = await axiosInstance.post<{
        message: string;
        data: StorefrontProduct;
      }>(STOREFRONT.RATE_PRODUCT(slug, productId), { rating });
      return data.data;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: [...storefrontKeys.all, 'discover-pages'] });
      await queryClient.cancelQueries({ queryKey: [...storefrontKeys.all, 'products', vars.slug] });

      const previousDiscover = queryClient.getQueriesData({
        queryKey: [...storefrontKeys.all, 'discover-pages'],
      });
      const previousShop = queryClient.getQueriesData({
        queryKey: [...storefrontKeys.all, 'products', vars.slug],
      });

      const patch = (product: StorefrontProduct): StorefrontProduct => {
        if (product.id !== vars.productId) return product;
        const next = applyOptimisticRating(
          Number(product.rating_avg ?? 0),
          Number(product.rating_count ?? 0),
          product.my_rating,
          vars.rating,
        );
        return { ...product, ...next };
      };

      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'discover-pages'] },
        (old: unknown) => mapProductsInInfinite(old, patch),
      );
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'products', vars.slug] },
        (old: unknown) => mapProductsInShopList(old, patch),
      );

      return { previousDiscover, previousShop };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previousDiscover?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      ctx?.previousShop?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (product, vars) => {
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'discover-pages'] },
        (old: unknown) => patchProductInInfinite(old, product),
      );
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'products', vars.slug] },
        (old: unknown) => patchProductInShopList(old, product),
      );
    },
  });
}

/** Shop 1–5 rating with optimistic shops list + shop detail patch. */
export function useRateStorefrontShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, rating }: { slug: string; rating: number }) => {
      const { data } = await axiosInstance.post<{
        message: string;
        data: StorefrontShop;
      }>(STOREFRONT.RATE_SHOP(slug), { rating });
      return data.data;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: storefrontKeys.shopsPages() });
      await queryClient.cancelQueries({ queryKey: storefrontKeys.shop(vars.slug) });
      await queryClient.cancelQueries({ queryKey: [...storefrontKeys.all, 'products', vars.slug] });

      const previousShops = queryClient.getQueryData(storefrontKeys.shopsPages());
      const previousShop = queryClient.getQueryData(storefrontKeys.shop(vars.slug));
      const previousProducts = queryClient.getQueriesData({
        queryKey: [...storefrontKeys.all, 'products', vars.slug],
      });

      const patchShop = (shop: StorefrontShop): StorefrontShop => {
        if (shop.slug !== vars.slug) return shop;
        const next = applyOptimisticRating(
          Number(shop.rating_avg ?? 0),
          Number(shop.rating_count ?? 0),
          shop.my_rating,
          vars.rating,
        );
        return { ...shop, ...next };
      };

      queryClient.setQueriesData(
        { queryKey: storefrontKeys.shopsPages() },
        (old: unknown) => mapShopsInInfinite(old, patchShop),
      );
      queryClient.setQueryData(storefrontKeys.shop(vars.slug), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return patchShop(old as StorefrontShop);
      });
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'products', vars.slug] },
        (old: unknown) => {
          if (!old || typeof old !== 'object' || !('shop' in old)) return old;
          const list = old as { products: StorefrontProduct[]; shop?: StorefrontShop };
          return {
            ...list,
            shop: list.shop ? patchShop(list.shop) : list.shop,
          };
        },
      );

      return { previousShops, previousShop, previousProducts };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previousShops != null) {
        queryClient.setQueryData(storefrontKeys.shopsPages(), ctx.previousShops);
      }
      if (ctx?.previousShop != null) {
        queryClient.setQueryData(storefrontKeys.shop(vars.slug), ctx.previousShop);
      }
      ctx?.previousProducts?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (shop) => {
      queryClient.setQueriesData(
        { queryKey: storefrontKeys.shopsPages() },
        (old: unknown) => mapShopsInInfinite(old, (s) => (s.slug === shop.slug ? { ...s, ...shop } : s)),
      );
      queryClient.setQueryData(storefrontKeys.shop(shop.slug), shop);
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'products', shop.slug] },
        (old: unknown) => {
          if (!old || typeof old !== 'object' || !('shop' in old)) return old;
          const list = old as { products: StorefrontProduct[]; shop?: StorefrontShop };
          return { ...list, shop: { ...list.shop, ...shop } };
        },
      );
    },
  });
}
