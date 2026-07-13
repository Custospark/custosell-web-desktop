import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { HR } from './hrEndpoints';
import { hrKeys } from './hrQueryKeys';
import { cleanParams, listDefaults, unwrapEntity, unwrapList, useHrErrorToast } from './hrQueryShared';
import type {
  CreateOnboardingTaskPayload,
  CreateOnboardingTemplatePayload,
  CreateReviewPayload,
  HrOnboardingTask,
  HrOnboardingTemplate,
  HrPerformanceRosterRow,
  HrPerformanceSnapshot,
  HrReview,
  UpdateOnboardingTaskPayload,
  UpdateReviewPayload,
} from './hrTypes';

export function useHrOnboardingTemplates(enabled = true) {
  return useQuery({
    queryKey: hrKeys.onboardingTemplates(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ONBOARDING_TEMPLATES);
      return unwrapList<HrOnboardingTemplate>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrOnboardingTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateOnboardingTemplatePayload) => {
      const { data } = await axiosInstance.post(HR.ONBOARDING_TEMPLATES, payload);
      return unwrapEntity<HrOnboardingTemplate>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: hrKeys.onboardingTemplates() });
      showToast('success', 'Onboarding template created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create template'),
  });
}

export function useHrOnboardingTasks(filters?: { employee_id?: number; status?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.onboardingTasks(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.ONBOARDING_TASKS, { params: cleanParams(filters) });
      return unwrapList<HrOnboardingTask>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrOnboardingTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateOnboardingTaskPayload) => {
      const { data } = await axiosInstance.post(HR.ONBOARDING_TASKS, payload);
      return unwrapEntity<HrOnboardingTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'onboarding-tasks'] });
      showToast('success', 'Onboarding task created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create task'),
  });
}

export function useUpdateHrOnboardingTask() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateOnboardingTaskPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.ONBOARDING_TASK(id), payload);
      return unwrapEntity<HrOnboardingTask>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'onboarding-tasks'] });
      showToast('success', 'Task updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update task'),
  });
}

export function useHrReviews(filters?: { employee_id?: number; status?: string }, enabled = true) {
  return useQuery({
    queryKey: hrKeys.reviews(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.REVIEWS, { params: cleanParams(filters) });
      return unwrapList<HrReview>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useCreateHrReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const { data } = await axiosInstance.post(HR.REVIEWS, payload);
      return unwrapEntity<HrReview>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      showToast('success', 'Review created');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not create review'),
  });
}

export function useUpdateHrReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateReviewPayload & { id: number }) => {
      const { data } = await axiosInstance.patch(HR.REVIEW(id), payload);
      return unwrapEntity<HrReview>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      showToast('success', 'Review updated');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not update review'),
  });
}

export type HrPerformancePeriodFilters = {
  period?: string;
  from?: string;
  to?: string;
};

export function useHrPerformanceRoster(filters?: HrPerformancePeriodFilters, enabled = true) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceRoster(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE, { params: cleanParams(params) });
      return unwrapList<HrPerformanceRosterRow>(data);
    },
    enabled,
    ...listDefaults,
  });
}

export function useHrPerformanceEmployee(
  employeeId: number | null | undefined,
  filters?: HrPerformancePeriodFilters,
  enabled = true,
) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceEmployee(employeeId ?? 0, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE_EMPLOYEE(employeeId!), {
        params: cleanParams(params),
      });
      return unwrapEntity<HrPerformanceSnapshot>(data);
    },
    enabled: enabled && !!employeeId,
    ...listDefaults,
  });
}

export function useHrPerformanceByUser(
  userId: number | null | undefined,
  filters?: HrPerformancePeriodFilters,
  enabled = true,
) {
  const params = {
    period: filters?.period,
    from: filters?.from,
    to: filters?.to,
  };
  return useQuery({
    queryKey: hrKeys.performanceByUser(userId ?? 0, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR.PERFORMANCE_BY_USER(userId!), {
        params: cleanParams(params),
      });
      return unwrapEntity<HrPerformanceSnapshot>(data);
    },
    enabled: enabled && !!userId,
    ...listDefaults,
  });
}

export function useSeedHrPerformanceReview() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useHrErrorToast();
  return useMutation({
    mutationFn: async ({
      employeeId,
      period,
      from,
      to,
    }: {
      employeeId: number;
      period?: string;
      from?: string;
      to?: string;
    }) => {
      const { data } = await axiosInstance.post(
        HR.PERFORMANCE_SEED_REVIEW(employeeId),
        null,
        { params: cleanParams({ period, from, to }) },
      );
      return unwrapEntity<{ review: HrReview; snapshot: HrPerformanceSnapshot }>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'reviews'] });
      void qc.invalidateQueries({ queryKey: [...hrKeys.all, 'performance'] });
      showToast('success', 'Draft review seeded from Pipeline/Projects work');
    },
    onError: (err: AxiosError<{ message?: string }>) => onError(err, 'Could not seed review from work data'),
  });
}
