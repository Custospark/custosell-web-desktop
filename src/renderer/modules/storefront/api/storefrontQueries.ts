import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
import { STOREFRONT_ORDERS_POLL_MS, storefrontKeys } from './storefrontQueryKeys';
import { optimisticallyRemoveWishlistProducts } from './wishlistQueries';

export { storefrontKeys };
export { useRateStorefrontProduct, useRateStorefrontShop } from './storefrontRatingQueries';

// Always-fresh catalogs: Products & Services and Businesses must never show stale
// cache. staleTime 0 → every mount/focus refetches; a 60s interval keeps the open
// Discover page current without waiting for a refocus.
const CATALOG_STALE_MS = 0;
const CATALOG_GC_MS = 60 * 60_000;
const CATALOG_REFRESH_MS = 60_000;

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

async function fetchShopsPage(pageParam: number, q = '') {
  const { data } = await axiosInstance.get(STOREFRONT.SHOPS, {
    params: {
      per_page: 24,
      page: pageParam,
      q: q.trim() || undefined,
    },
  });
  return {
    shops: unwrapList<StorefrontShop>(data),
    meta: pageMeta(data),
  };
}

async function fetchDiscoverPage(pageParam: number, category = '') {
  const { data } = await axiosInstance.get(STOREFRONT.DISCOVER, {
    params: {
      per_page: 24,
      page: pageParam,
      category: category || undefined,
    },
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
      queryFn: ({ pageParam }) => fetchShopsPage(pageParam, ''),
      staleTime: CATALOG_STALE_MS,
      gcTime: CATALOG_GC_MS,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: storefrontKeys.discoverPages(''),
      initialPageParam: 1,
      queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam, ''),
      staleTime: CATALOG_STALE_MS,
      gcTime: CATALOG_GC_MS,
    }),
  ]);
}

/** Progressive shops — optional server `q` (name, city, @slug). */
export function useStorefrontShopsInfinite(q = '') {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: storefrontKeys.shopsPages(query),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchShopsPage(pageParam, query),
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: CATALOG_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

/** Progressive cross-shop products — optional category filter; text search is client-side. */
export function useStorefrontDiscoverInfinite(category = '') {
  return useInfiniteQuery({
    queryKey: storefrontKeys.discoverPages(category),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam, category),
    getNextPageParam: (last) => nextPage(last.meta),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: CATALOG_REFRESH_MS,
    refetchIntervalInBackground: false,
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
export function useMyStorefrontOrdersList(enabled = true, options?: { poll?: boolean }) {
  const poll = options?.poll === true && enabled;
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
    refetchInterval: poll ? STOREFRONT_ORDERS_POLL_MS : false,
    refetchIntervalInBackground: true,
  });
}

/** Strip badge — open orders only, so the count reflects what still needs attention. */
export function useMyStorefrontOrdersCount(enabled = true) {
  return useQuery({
    queryKey: [storefrontKeys.myOrdersCount()],
    queryFn: async () => {
      const { data } = await axiosInstance.get(STOREFRONT.MY_ORDERS, {
        params: { status: 'open', per_page: 1, page: 1 },
      });
      return pageMeta(data).total ?? 0;
    },
    enabled,
    staleTime: 15_000,
    refetchOnMount: 'always',
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
    staleTime: CATALOG_STALE_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
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
    retry: 1,
    staleTime: CATALOG_STALE_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: CATALOG_REFRESH_MS,
    refetchIntervalInBackground: false,
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
    staleTime: CATALOG_STALE_MS,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: CATALOG_REFRESH_MS,
    refetchIntervalInBackground: false,
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
    onMutate: async () => {
      // Orders badge can bump early; wishlist stays until the server records the order.
      await queryClient.cancelQueries({ queryKey: storefrontKeys.myOrdersList() });
      const prevOrders = queryClient.getQueryData<{ total?: number }>(storefrontKeys.myOrdersList());
      if (prevOrders && typeof prevOrders.total === 'number') {
        queryClient.setQueryData(storefrontKeys.myOrdersList(), {
          ...prevOrders,
          total: prevOrders.total + 1,
        });
      }
      const prevCount = queryClient.getQueryData<number>(storefrontKeys.myOrdersCount());
      if (typeof prevCount === 'number') {
        queryClient.setQueryData(storefrontKeys.myOrdersCount(), prevCount + 1);
      }
      return { prevOrders, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevOrders !== undefined) {
        queryClient.setQueryData(storefrontKeys.myOrdersList(), ctx.prevOrders);
      }
      if (ctx?.prevCount !== undefined) {
        queryClient.setQueryData(storefrontKeys.myOrdersCount(), ctx.prevCount);
      }
    },
    onSuccess: async (_data, vars) => {
      // Backend already removed ordered products from wishlist — sync UI now.
      const productIds = vars.items.map((i) => i.product_id);
      optimisticallyRemoveWishlistProducts(queryClient, productIds);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersList() }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersPages() }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersCount() }),
        queryClient.invalidateQueries({ queryKey: [...storefrontKeys.all, 'my-orders'] }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.wishlist() }),
        queryClient.invalidateQueries({ queryKey: storefrontKeys.wishlistCount() }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: storefrontKeys.myOrdersList() }),
        queryClient.refetchQueries({ queryKey: storefrontKeys.myOrdersPages() }),
      ]);
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
