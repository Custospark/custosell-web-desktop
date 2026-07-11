import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { MARKETPLACE } from './marketplaceEndpoints';
import { marketplaceKeys } from './marketplaceQueryKeys';
import type { MarketplaceBusiness, MarketplaceProduct } from './marketplaceTypes';

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

export function useMarketplaceBusinesses(q?: string, enabled = true) {
  return useQuery({
    queryKey: marketplaceKeys.businesses(q),
    queryFn: async () => {
      const { data } = await axiosInstance.get(MARKETPLACE.BUSINESSES, {
        params: q?.trim() ? { q: q.trim() } : undefined,
      });
      return unwrapList<MarketplaceBusiness>(data);
    },
    enabled,
    retry: false,
  });
}

export function useMarketplaceProducts(businessId: number | null, enabled = true) {
  return useQuery({
    queryKey: marketplaceKeys.products(businessId ?? 0),
    queryFn: async () => {
      if (!businessId) return [] as MarketplaceProduct[];
      const { data } = await axiosInstance.get(MARKETPLACE.PRODUCTS(businessId));
      return unwrapList<MarketplaceProduct>(data);
    },
    enabled: enabled && businessId != null && businessId > 0,
    retry: false,
  });
}
