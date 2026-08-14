import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { stockLedger } from '../../../../app/store/offline/inventory/stockLedger';
import { refreshProductCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { inventoryKeys } from './inventoryKeys';
import {
  shouldCompleteStockAdjustmentLocally,
  completeOfflineStockAdjustmentInstant,
} from '../../../../app/store/offline/inventory/completeOfflineStockAdjustment';
import type { StockMovement, CreateStockMovementData, Product } from './ProductTypes';

function extractStockMovementFromResponse(responseData: unknown): StockMovement | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: StockMovement };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as StockMovement;
  if ('id' in direct && 'stock_after' in direct) return direct;
  return null;
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const validationMessage = axiosErr.response?.data?.errors
    ? Object.values(axiosErr.response.data.errors).flat().join(' ')
    : undefined;
  return validationMessage || sanitizeErrorMessage(err, fallback);
}

/** ── Stock Movements ── */

export function useStockMovements() {
  return useQuery<StockMovement[]>({
    queryKey: inventoryKeys.stockMovements(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StockMovement[] }>('/stock-movements');
      return response.data;
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    StockMovement,
    AxiosError<ApiError>,
    CreateStockMovementData,
    { previousProducts: Product[] | undefined }
  >({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (shouldCompleteStockAdjustmentLocally()) {
        return completeOfflineStockAdjustmentInstant(payload);
      }
      try {
        const { data } = await axiosInstance.post('/stock-movements', payload);
        const movement = extractStockMovementFromResponse(data);
        if (!movement) {
          throw new Error('Invalid stock movement response from server');
        }
        return movement;
      } catch (err: unknown) {
        if (shouldCompleteStockAdjustmentLocally()) {
          return completeOfflineStockAdjustmentInstant(payload);
        }
        throw err;
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.products() });
      const previousProducts = queryClient.getQueryData<Product[]>(inventoryKeys.products());
      queryClient.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) =>
          p.id === payload.product_id ? { ...p, stock_quantity: payload.stock_after } : p,
        ),
      );
      return { previousProducts };
    },
    onSuccess: (movement, payload) => {
      const stockAfter = movement?.stock_after ?? payload.stock_after;
      queryClient.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) =>
          p.id === payload.product_id ? { ...p, stock_quantity: stockAfter } : p,
        ),
      );
      void stockLedger.set(payload.product_id, stockAfter).catch(() => undefined);
      void refreshProductCatalogSnapshot();

      if ((movement?.id ?? 0) < 0) {
        showToast('success', 'Stock adjusted - will sync when online');
      }
    },
    onError: (error, _payload, ctx) => {
      if (ctx?.previousProducts) {
        queryClient.setQueryData(inventoryKeys.products(), ctx.previousProducts);
      }
      const message = extractApiErrorMessage(error, 'Failed to record stock movement');
      console.error('[StockMovement] Failed:', error);
      showToast('error', message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
    },
  });
}