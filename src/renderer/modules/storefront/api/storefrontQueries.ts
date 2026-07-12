import { useMutation, useQuery } from '@tanstack/react-query';
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
  shops: (q: string) => [...storefrontKeys.all, 'shops', q] as const,
  categories: () => [...storefrontKeys.all, 'categories'] as const,
  shop: (slug: string) => [...storefrontKeys.all, 'shop', slug] as const,
  products: (slug: string, category: string) => [...storefrontKeys.all, 'products', slug, category] as const,
  myOrders: (status?: string, q?: string) => [...storefrontKeys.all, 'my-orders', status ?? '', q ?? ''] as const,
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
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
