import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PERSONAL_SUBSCRIPTIONS } from '../../../shared/api/endpoints/endpoints';
import { useAppSelector } from '../../../app/store/hooks/useApp';

export interface PersonalModule {
  slug: string;
  label: string;
  description: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
}

export interface MySubscription {
  id: number;
  module_slug: string;
  status: string;
  billing_cycle: string;
  price_usd: number;
  current_period_end: string | null;
  cancelled_at: string | null;
}

export interface MySubscriptionsResponse {
  subscriptions: MySubscription[];
  total_monthly_usd: number;
}

export interface PaymentResponse {
  message: string;
  payment: {
    id: number;
    amount: number;
    currency: string;
    status: string;
  };
}

export function useAvailableModules() {
  return useQuery({
    queryKey: ['personal', 'modules', 'available'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ modules: PersonalModule[] }>(
        PERSONAL_SUBSCRIPTIONS.AVAILABLE,
      );
      return data.modules;
    },
    staleTime: 60_000,
  });
}

export function useMySubscriptions() {
  const user = useAppSelector((s) => s.auth.user);
  return useQuery({
    queryKey: ['personal', 'modules', 'mine'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<MySubscriptionsResponse>(
        PERSONAL_SUBSCRIPTIONS.MINE,
      );
      return data;
    },
    enabled: user?.account_type === 'personal',
    staleTime: 10_000,
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { module_slug: string; billing_cycle?: string }) => {
      const { data } = await axiosInstance.post(PERSONAL_SUBSCRIPTIONS.SUBSCRIBE, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal', 'modules', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.post(PERSONAL_SUBSCRIPTIONS.CANCEL(id));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal', 'modules', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<PaymentResponse>(
        PERSONAL_SUBSCRIPTIONS.PAY,
      );
      return data;
    },
  });
}
