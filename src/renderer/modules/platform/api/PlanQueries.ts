import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLANS } from '../../../shared/api/endpoints/endpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import { platformFreshQuery, platformKeys, platformMutationError } from './PlatformQueries';
import type { Plan } from '../../../shared/types';

export interface PlanFormPayload {
  name: string;
  slug: string;
  description?: string | null;
  price_monthly_usd: number;
  price_yearly_usd?: number | null;
  onboarding_fee_usd?: number | null;
  trial_days?: number | null;
  billing_cycle?: 'monthly' | 'yearly' | 'both';
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  is_active?: boolean;
  is_popular?: boolean;
  sort_order?: number;
}

export function usePlans() {
  return useQuery({
    queryKey: platformKeys.plans(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(PLANS);
      return data.data;
    },
    ...platformFreshQuery,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: PlanFormPayload) => {
      const { data } = await axiosInstance.post<{ data: Plan }>(PLANS, payload);
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Plan created successfully.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to create plan')),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...payload }: PlanFormPayload & { id: number }) => {
      const { data } = await axiosInstance.put<{ data: Plan }>(`${PLANS}/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      showToast('success', 'Plan updated successfully.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to update plan')),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await axiosInstance.delete<{ message: string }>(`${PLANS}/${id}`);
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Plan deleted successfully.');
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
    },
    onError: (err: Error) => showToast('error', platformMutationError(err, 'Failed to delete plan')),
  });
}
