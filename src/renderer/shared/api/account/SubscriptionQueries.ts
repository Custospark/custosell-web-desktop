import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/ToastContext';
import { BILLING, SUBSCRIPTIONS } from '../endpoints/endpoints';
import { store } from '../../../app/store/store';
import type { PaymentType } from '../../types';

const PESAPAL_SUPPORTED_CURRENCIES = ['UGX', 'KES', 'TZS'];

export function getPaymentCurrency(): string {
  try {
    const state = store.getState();
    const currency = (state as { auth?: { user?: { business?: { currency?: string } } } }).auth?.user?.business?.currency;
    const upper = (currency || 'UGX').toUpperCase();
    if (PESAPAL_SUPPORTED_CURRENCIES.includes(upper)) return upper;
    return 'USD';
  } catch {
    return 'USD';
  }
}

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

export function useInitiatePayment(paymentType: PaymentType) {
  const { showToast } = useToast();
  return useMutation<{ success: boolean; payment_id: number; message: string; redirect_url?: string }, AxiosError<ApiError>, {
    amount: number;
    currency?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(BILLING.INITIATE, {
        gateway_name: 'pesapal',
        amount: payload.amount,
        currency: payload.currency ?? 'USD',
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
    currency?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(BILLING.INITIATE, {
        gateway_name: 'pesapal',
        amount: payload.amount,
        currency: payload.currency ?? 'USD',
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
  proration_due_usd: number;
  credit_usd: number;
  charge_usd: number;
}

export interface UpgradeQuote {
  current_plan: { id: number; name: string; price_monthly_usd: number; price_yearly_usd: number };
  new_plan: { id: number; name: string; price_monthly_usd: number; price_yearly_usd: number };
  billing_cycle: string;
  next_billing_date: string;
  proration: ProrationDetails;
}

export function useUpgradeQuote(subscriptionId: number | null, toPlanId: number | null, billingCycle?: 'monthly' | 'yearly') {
  return useQuery({
    queryKey: ['subscription', 'upgrade-quote', subscriptionId, toPlanId, billingCycle],
    queryFn: async () => {
      const params: Record<string, string | number> = { to_plan_id: toPlanId! };
      if (billingCycle) params.billing_cycle = billingCycle;
      const { data } = await axiosInstance.get<{ data: UpgradeQuote }>(
        SUBSCRIPTIONS.PRORATION_QUOTE(subscriptionId!),
        { params },
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
    billing_cycle?: 'monthly' | 'yearly';
  }>({
    mutationFn: async (payload) => {
      const body: Record<string, unknown> = {
        to_plan_id: payload.to_plan_id,
        effective: payload.effective ?? 'immediate',
      };
      if (payload.billing_cycle) body.billing_cycle = payload.billing_cycle;
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.UPGRADE(payload.subscriptionId), body);
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
  const queryClient = useQueryClient();
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
    onSuccess: (_data, variables) => {
      showToast('success', 'Downgrade scheduled successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription', 'changes', variables.subscriptionId] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to downgrade plan.';
      showToast('error', message);
    },
  });
}

export function useCancelScheduledChange() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, AxiosError<ApiError>, { subscriptionId: number }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(SUBSCRIPTIONS.CANCEL_CHANGE(payload.subscriptionId));
      return data;
    },
    onSuccess: (_data, variables) => {
      showToast('success', 'Scheduled downgrade cancelled');
      queryClient.invalidateQueries({ queryKey: ['subscription', 'changes', variables.subscriptionId] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to cancel scheduled change.';
      showToast('error', message);
    },
  });
}

export function useChangeBillingCycle() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation<{ message: string; data: unknown; payment_required?: boolean }, AxiosError<ApiError>, {
    subscriptionId: number;
    billing_cycle: 'monthly' | 'yearly';
    effective?: 'immediate' | 'end_of_period';
  }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(
        SUBSCRIPTIONS.BILLING_CYCLE(payload.subscriptionId),
        { billing_cycle: payload.billing_cycle, effective: payload.effective },
      );
      return data;
    },
    onSuccess: (data) => {
      if (!data.payment_required) {
        showToast('success', data.message || 'Billing cycle updated');
        queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to change billing cycle';
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
