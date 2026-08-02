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
    onMutate: async (payload) => {
      const { from_location_id, to_location_id, items } = payload;
      const qtyByProduct = new Map<number, number>(
        items.filter((i) => i.quantity > 0).map((i) => [i.product_id, i.quantity]),
      );

      const fromKey = ['inventory', 'location-stock', from_location_id] as const;
      const toKey = ['inventory', 'location-stock', to_location_id] as const;

      const previousFrom = queryClient.getQueryData<LocationStockItem[]>(fromKey);
      const previousTo = queryClient.getQueryData<LocationStockItem[]>(toKey);

      queryClient.cancelQueries({ queryKey: fromKey });
      queryClient.cancelQueries({ queryKey: toKey });

      const applyFrom = (old: LocationStockItem[] = []) =>
        old.map((s) =>
          qtyByProduct.has(s.product_id)
            ? { ...s, stock_quantity: s.stock_quantity - (qtyByProduct.get(s.product_id) ?? 0) }
            : s,
        );

      if (previousFrom) {
        queryClient.setQueryData<LocationStockItem[]>(fromKey, applyFrom);
      }

      queryClient.setQueryData<LocationStockItem[]>(toKey, (old = []) => {
        const map = new Map(old.map((s) => [s.product_id, s]));
        for (const [productId, qty] of qtyByProduct) {
          const cur = map.get(productId);
          map.set(
            productId,
            cur
              ? { ...cur, stock_quantity: cur.stock_quantity + qty }
              : { location_id: to_location_id, product_id: productId, product_name: null, stock_quantity: qty, low_stock_threshold: 0 },
          );
        }
        return [...map.values()];
      });

      return { previousFrom: previousFrom ?? [], previousTo: previousTo ?? [], fromKey, toKey };
    },
    onError: (e, _payload, context) => {
      if (context) {
        queryClient.setQueryData<LocationStockItem[]>(context.fromKey, context.previousFrom);
        queryClient.setQueryData<LocationStockItem[]>(context.toKey, context.previousTo);
      }
      showToast('error', sanitizeErrorMessage(e, 'Failed to transfer stock'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'location-stock'] });
    },
    onSuccess: () => {
      showToast('success', 'Stock transferred between branches');
    },
  });
}