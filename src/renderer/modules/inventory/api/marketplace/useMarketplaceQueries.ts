import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
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

function unwrapBusiness(data: unknown): MarketplaceBusiness {
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (inner && typeof inner === 'object' && 'id' in (inner as object)) {
      return inner as MarketplaceBusiness;
    }
  }
  return data as MarketplaceBusiness;
}

function apiError(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<ApiError>;
  const msg = axiosErr.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  const errors = axiosErr.response?.data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0];
    if (typeof first === 'string') return first;
  }
  return sanitizeErrorMessage(err, fallback);
}

function invalidateSupplierCaches(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: marketplaceKeys.all });
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
    networkMode: 'online',
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
    networkMode: 'online',
  });
}

export function useMySuppliers(q?: string, enabled = true) {
  return useQuery({
    queryKey: marketplaceKeys.suppliers(q),
    queryFn: async () => {
      const { data } = await axiosInstance.get(MARKETPLACE.SUPPLIERS, {
        params: q?.trim() ? { q: q.trim() } : undefined,
      });
      return unwrapList<MarketplaceBusiness>(data);
    },
    enabled,
    retry: false,
    networkMode: 'online',
  });
}

export function useAddSupplier() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<MarketplaceBusiness, AxiosError<ApiError>, { seller_business_id: number; notes?: string }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(MARKETPLACE.SUPPLIERS, payload);
      return unwrapBusiness(data);
    },
    onSuccess: (biz) => {
      invalidateSupplierCaches(qc);
      showToast('success', `${biz.name} saved to My suppliers`);
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to save supplier')),
    networkMode: 'online',
  });
}

export function useRemoveSupplier() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, { sellerBusinessId: number; name?: string }>({
    mutationFn: async ({ sellerBusinessId }) => {
      await axiosInstance.delete(MARKETPLACE.SUPPLIER(sellerBusinessId));
    },
    onSuccess: (_data, vars) => {
      invalidateSupplierCaches(qc);
      showToast('success', vars.name ? `${vars.name} removed from My suppliers` : 'Supplier removed');
    },
    onError: (e) => showToast('error', apiError(e, 'Failed to remove supplier')),
    networkMode: 'online',
  });
}
