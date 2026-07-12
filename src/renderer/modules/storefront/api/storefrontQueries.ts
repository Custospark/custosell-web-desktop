import { useInfiniteQuery, useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
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
    refetchOnMount: false,
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
    refetchOnMount: false,
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
    staleTime: 30_000,
  });
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
  });
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
