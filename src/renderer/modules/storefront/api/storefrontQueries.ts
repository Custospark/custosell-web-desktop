import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import { applyOptimisticRating } from './ratingOptimistic';
import type {
  MyStorefrontOrder,
  PlaceStorefrontOrderPayload,
  PlaceStorefrontOrderResult,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontShop,
} from './storefrontTypes';

export const storefrontKeys = {
  all: ['storefront'] as const,
  discover: (q: string, category: string) => [...storefrontKeys.all, 'discover', q, category] as const,
  discoverPages: () => [...storefrontKeys.all, 'discover-pages'] as const,
  shops: (q: string) => [...storefrontKeys.all, 'shops', q] as const,
  shopsPages: () => [...storefrontKeys.all, 'shops-pages'] as const,
  categories: () => [...storefrontKeys.all, 'categories'] as const,
  shop: (slug: string) => [...storefrontKeys.all, 'shop', slug] as const,
  products: (slug: string, category: string) => [...storefrontKeys.all, 'products', slug, category] as const,
  myOrders: (status?: string, q?: string) => [...storefrontKeys.all, 'my-orders', status ?? '', q ?? ''] as const,
  myOrdersPages: () => [...storefrontKeys.all, 'my-orders-pages'] as const,
  myOrdersList: () => [...storefrontKeys.all, 'my-orders-list'] as const,
  myOrdersCount: () => [...storefrontKeys.all, 'my-orders-count'] as const,
};

const CATALOG_STALE_MS = 10 * 60_000;
const CATALOG_GC_MS = 60 * 60_000;

type PageMeta = {
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function pageMeta(payload: unknown): PageMeta {
  if (payload && typeof payload === 'object' && (payload as { meta?: PageMeta }).meta) {
    return (payload as { meta: PageMeta }).meta;
  }
  return {};
}

function nextPage(meta: PageMeta): number | undefined {
  const cur = meta.current_page ?? 1;
  const last = meta.last_page ?? 1;
  return cur < last ? cur + 1 : undefined;
}

async function fetchShopsPage(pageParam: number) {
  const { data } = await axiosInstance.get(STOREFRONT.SHOPS, {
    params: { per_page: 24, page: pageParam },
  });
  return {
    shops: unwrapList<StorefrontShop>(data),
    meta: pageMeta(data),
  };
}

async function fetchDiscoverPage(pageParam: number) {
  const { data } = await axiosInstance.get(STOREFRONT.DISCOVER, {
    params: { per_page: 24, page: pageParam },
  });
  return {
    products: unwrapList<StorefrontProduct>(data),
    meta: pageMeta(data),
  };
}

/** Warm shops + products into React Query so tab switches are instant. */
export async function prefetchStorefrontCatalogs(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: storefrontKeys.shopsPages(),
      initialPageParam: 1,
      queryFn: ({ pageParam }) => fetchShopsPage(pageParam),
      staleTime: CATALOG_STALE_MS,
      gcTime: CATALOG_GC_MS,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: storefrontKeys.discoverPages(),
      initialPageParam: 1,
      queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam),
      staleTime: CATALOG_STALE_MS,
      gcTime: CATALOG_GC_MS,
    }),
  ]);
}

/** Progressive shops — first page paints fast; later pages load in background. */
export function useStorefrontShopsInfinite() {
  return useInfiniteQuery({
    queryKey: storefrontKeys.shopsPages(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchShopsPage(pageParam),
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

/** Progressive cross-shop products — filter client-side after pages land. */
export function useStorefrontDiscoverInfinite() {
  return useInfiniteQuery({
    queryKey: storefrontKeys.discoverPages(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam),
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useMyStorefrontOrdersInfinite() {
  return useInfiniteQuery({
    queryKey: storefrontKeys.myOrdersPages(),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await axiosInstance.get(STOREFRONT.MY_ORDERS, {
        params: { per_page: 24, page: pageParam },
      });
      return {
        orders: unwrapList<MyStorefrontOrder>(data),
        meta: pageMeta(data),
      };
    },
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
}

/**
 * Buyer orders + total — single source for My Orders page and strip badge.
 * (Avoids optimistic count bumps that disagree with an empty list.)
 */
export function useMyStorefrontOrdersList(enabled = true) {
  return useQuery({
    queryKey: storefrontKeys.myOrdersList(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.MY_ORDERS, {
        params: { per_page: 48, page: 1 },
      });
      const orders = unwrapList<MyStorefrontOrder>(data);
      const total = pageMeta(data).total ?? orders.length;
      return { orders, total };
    },
    enabled,
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
}

/** Strip badge — same cache as the orders list. */
export function useMyStorefrontOrdersCount(enabled = true) {
  const list = useMyStorefrontOrdersList(enabled);
  return {
    ...list,
    data: list.data?.total ?? 0,
  };
}

export function useStorefrontDiscover(q: string, category: string) {
  return useQuery({
    queryKey: storefrontKeys.discover(q, category),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.DISCOVER, {
        params: {
          q: q || undefined,
          category: category || undefined,
          per_page: 48,
        },
      });
      return {
        products: unwrapList<StorefrontProduct>(data),
        meta: (data as { meta?: { total?: number } })?.meta ?? {},
      };
    },
    staleTime: 60_000,
  });
}

export function useStorefrontShops(q: string) {
  return useQuery({
    queryKey: storefrontKeys.shops(q),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.SHOPS, {
        params: { q: q || undefined, per_page: 48 },
      });
      return unwrapList<StorefrontShop>(data);
    },
    staleTime: 60_000,
  });
}

export function useStorefrontCategories() {
  return useQuery({
    queryKey: storefrontKeys.categories(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.CATEGORIES);
      return unwrapList<StorefrontCategory>(data);
    },
    staleTime: 60_000,
  });
}

export function useStorefrontShop(slug: string) {
  return useQuery({
    queryKey: storefrontKeys.shop(slug),
    queryFn: async () => {
      const { data } = await axiosInstance.get<StorefrontShop>(STOREFRONT.SHOP(slug));
      return data;
    },
    enabled: Boolean(slug),
    retry: false,
    staleTime: 60_000,
  });
}

export function useStorefrontShopProducts(slug: string, category = '') {
  return useQuery({
    queryKey: storefrontKeys.products(slug, category),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.PRODUCTS(slug), {
        params: { category: category || undefined },
      });
      return {
        products: unwrapList<StorefrontProduct>(data),
        shop: (data as { shop?: StorefrontShop }).shop,
      };
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function usePlaceStorefrontOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slug,
      ...payload
    }: PlaceStorefrontOrderPayload & { slug: string }) => {
      const { data } = await axiosInstance.post<PlaceStorefrontOrderResult>(
        STOREFRONT.ORDERS(slug),
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersList() }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersPages() }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersCount() }),
        queryClient.invalidateQueries({ queryKey: [...storefrontKeys.all, 'my-orders'] }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: storefrontKeys.myOrdersList() }),
        queryClient.refetchQueries({ queryKey: storefrontKeys.myOrdersPages() }),
      ]);
    },
  });
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
      await queryClient.cancelQueries({ queryKey: storefrontKeys.discoverPages() });
      await queryClient.cancelQueries({ queryKey: [...storefrontKeys.all, 'products', vars.slug] });

      const previousDiscover = queryClient.getQueryData(storefrontKeys.discoverPages());
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
        { queryKey: storefrontKeys.discoverPages() },
        (old: unknown) => mapProductsInInfinite(old, patch),
      );
      queryClient.setQueriesData(
        { queryKey: [...storefrontKeys.all, 'products', vars.slug] },
        (old: unknown) => mapProductsInShopList(old, patch),
      );

      return { previousDiscover, previousShop };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previousDiscover != null) {
        queryClient.setQueryData(storefrontKeys.discoverPages(), ctx.previousDiscover);
      }
      ctx?.previousShop?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSuccess: (product, vars) => {
      queryClient.setQueriesData(
        { queryKey: storefrontKeys.discoverPages() },
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

export function useMyStorefrontOrders(filters?: { status?: string; q?: string }) {
  return useQuery({
    queryKey: storefrontKeys.myOrders(filters?.status, filters?.q),
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.MY_ORDERS, {
        params: {
          status: filters?.status || undefined,
          q: filters?.q || undefined,
          per_page: 48,
        },
      });
      return unwrapList<MyStorefrontOrder>(data);
    },
  });
}
