import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { STOREFRONT } from '../../../shared/api/endpoints/endpoints';
import { storefrontKeys } from './storefrontQueryKeys';

async function invalidateMyOrders(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersList() }),
    queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersPages() }),
    queryClient.invalidateQueries({ queryKey: storefrontKeys.myOrdersCount() }),
    queryClient.invalidateQueries({ queryKey: [...storefrontKeys.all, 'my-orders'] }),
  ]);
}

export function useCancelMyStorefrontOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await axiosInstance.post(STOREFRONT.MY_ORDER_CANCEL(orderId));
      return data;
    },
    onSuccess: async () => {
      await invalidateMyOrders(queryClient);
    },
  });
}

export function useDeleteMyStorefrontOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: number) => {
      await axiosInstance.delete(STOREFRONT.MY_ORDER(orderId));
    },
    onSuccess: async () => {
      await invalidateMyOrders(queryClient);
    },
  });
}
