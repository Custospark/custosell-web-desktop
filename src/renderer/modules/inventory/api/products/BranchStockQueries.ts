import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { STOCK_TRANSFER, PRODUCTS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { inventoryKeys } from './ProductQueries';

export interface LocationStockItem {
  location_id: number;
  product_id: number;
  product_name: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface LocationStockResponse {
  data: LocationStockItem[];
}

export interface TransferLine {
  product_id: number;
  quantity: number;
}

export interface TransferPayload {
  from_location_id: number;
  to_location_id: number;
  items: TransferLine[];
}

export interface TransferResult {
  count: number;
  from_location_id: number;
  to_location_id: number;
  movements: unknown[];
}

export function useLocationStock(locationId: number | null) {
  return useQuery<LocationStockItem[]>({
    queryKey: ['inventory', 'location-stock', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data } = await axiosInstance.get<LocationStockResponse>(`${PRODUCTS.BASE}/stock/${locationId}`);
      return data.data;
    },
    enabled: Boolean(locationId),
    staleTime: 30_000,
  });
}

export function useStockTransfer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<unknown, AxiosError<ApiError>, TransferPayload>({
    networkMode: 'always',
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(STOCK_TRANSFER, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      showToast('success', 'Stock transferred between branches');
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to transfer stock'));
    },
  });
}