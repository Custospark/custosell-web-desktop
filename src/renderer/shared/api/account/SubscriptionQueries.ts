import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/ToastContext';
import { BILLING, SUBSCRIPTIONS } from '../endpoints/endpoints';

export function useSubscribe() {
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, { plan_id: number; billing_cycle?: string }>({
    mutationFn: async (payload) => {
      await axiosInstance.post(SUBSCRIPTIONS.SUBSCRIBE, payload);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create subscription.';
      showToast('error', message);
    },
  });
}

export function useReactivate() {
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, { subscriptionId: number }>({
    mutationFn: async (payload) => {
      await axiosInstance.post(SUBSCRIPTIONS.REACTIVATE(payload.subscriptionId));
    },
    onSuccess: () => {
      showToast('success', 'Subscription reactivated successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reactivate subscription.';
      showToast('error', message);
    },
  });
}

let idempotencyCounter = 0;

function generateIdempotencyKey(): string {
  idempotencyCounter++;
  return `pay_${Date.now()}_${idempotencyCounter}_${crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;
}

export function useInitiatePayment(paymentType: string) {
  const { showToast } = useToast();
  return useMutation<{ success: boolean; payment_id: number; message: string; redirect_url?: string }, AxiosError<ApiError>, {
    amount: number;
    currency: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(BILLING.INITIATE, {
        gateway_name: 'pesapal',
        amount: payload.amount,
        currency: payload.currency,
        payment_type: paymentType,
        phone: payload.phone,
        metadata: payload.metadata ?? null,
        idempotency_key: generateIdempotencyKey(),
      });
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to initiate payment. Please try again.';
      showToast('error', message);
    },
  });
}

export function useInitiateOnboardingPayment() {
  const { showToast } = useToast();
  return useMutation<{ success: boolean; payment_id: number; message: string; redirect_url?: string }, AxiosError<ApiError>, {
    amount: number;
    currency: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(BILLING.INITIATE, {
        gateway_name: 'pesapal',
        amount: payload.amount,
        currency: payload.currency,
        payment_type: 'onboarding',
        phone: payload.phone,
        metadata: payload.metadata ?? null,
        idempotency_key: generateIdempotencyKey(),
      });
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to initiate payment. Please try again.';
      showToast('error', message);
    },
  });
}

export function useBillingPayment(id: number | null) {
  return useQuery({
    queryKey: ['billing', 'payment', id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(BILLING.PAYMENT(id!));
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const payment = query.state.data;
      if (payment?.data?.status === 'completed' || payment?.data?.status === 'failed') {
        return false;
      }
      return 3000;
    },
  });
}

export interface ProrationDetails {
  proration_due: number;
  days_remaining: number;
  days_in_period: number;
  credit: number;
  charge: number;
  old_price: number;
  new_price: number;
  old_price_usd: number;
  new_price_usd: number;
}

export interface UpgradeQuote {
  current_plan: { id: number; name: string; price_monthly: number; price_yearly: number };
  new_plan: { id: number; name: string; price_monthly: number; price_yearly: number };
  billing_cycle: string;
  next_billing_date: string;
  proration: ProrationDetails;
}

export function useUpgradeQuote(subscriptionId: number | null, toPlanId: number | null) {
  return useQuery({
    queryKey: ['subscription', 'upgrade-quote', subscriptionId, toPlanId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: UpgradeQuote }>(
        SUBSCRIPTIONS.PRORATION_QUOTE(subscriptionId!),
        { params: { to_plan_id: toPlanId! } },
      );
      return data.data;
    },
    enabled: !!subscriptionId && !!toPlanId,
  });
}

export function useUpgrade() {
  const { showToast } = useToast();
  return useMutation<{ scheduled_change: unknown; proration: UpgradeQuote }, AxiosError<ApiError>, {
    subscriptionId: number;
    to_plan_id: number;
    effective?: 'immediate' | 'end_of_period';
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.UPGRADE(payload.subscriptionId), {
        to_plan_id: payload.to_plan_id,
        effective: payload.effective ?? 'immediate',
      });
      return data;
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to upgrade plan.';
      showToast('error', message);
    },
  });
}

export function useDowngrade() {
  const { showToast } = useToast();
  return useMutation<{ scheduled_change: unknown; proration: unknown }, AxiosError<ApiError>, {
    subscriptionId: number;
    to_plan_id: number;
    effective?: 'immediate' | 'end_of_period';
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.DOWNGRADE(payload.subscriptionId), {
        to_plan_id: payload.to_plan_id,
        effective: payload.effective ?? 'end_of_period',
      });
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Downgrade scheduled successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to downgrade plan.';
      showToast('error', message);
    },
  });
}

export function useSubscriptionChanges(subscriptionId: number | null) {
  return useQuery({
    queryKey: ['subscription', 'changes', subscriptionId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Record<string, unknown>[] }>(SUBSCRIPTIONS.CHANGES(subscriptionId!));
      return data.data;
    },
    enabled: !!subscriptionId,
  });
}

interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
}
