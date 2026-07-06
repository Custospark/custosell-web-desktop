import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { ESTIMATES } from '../../../shared/api/endpoints/endpoints';
import type {
  ConvertEstimateResult,
  CreateEstimatePayload,
  Estimate,
  EstimateAnalytics,
  EstimateTemplate,
  EstimateVersion,
  RejectEstimatePayload,
  UpdateEstimatePayload,
} from './estimateTypes';

export const estimateKeys = {
  all: ['estimates'] as const,
  list: (filters?: Record<string, string>) => [...estimateKeys.all, 'list', filters] as const,
  detail: (id: number) => [...estimateKeys.all, 'detail', id] as const,
  versions: (id: number) => [...estimateKeys.all, 'versions', id] as const,
  analytics: (filters?: Record<string, string>) => [...estimateKeys.all, 'analytics', filters] as const,
  templates: () => [...estimateKeys.all, 'templates'] as const,
  template: (id: number) => [...estimateKeys.all, 'template', id] as const,
};

const queryDefaults = {
  staleTime: 0,
  refetchOnMount: 'always' as const,
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') return obj.data as T;
    return obj as T;
  }
  throw new Error('Invalid response');
}

function upsertEstimateInCache(qc: QueryClient, estimate: Estimate): void {
  qc.setQueryData<Estimate[]>(estimateKeys.list(), (old) => {
    const list = old ?? [];
    const idx = list.findIndex((e) => e.id === estimate.id);
    if (idx === -1) return [estimate, ...list];
    const next = [...list];
    next[idx] = estimate;
    return next;
  });
}

function prependEstimateToCache(qc: QueryClient, estimate: Estimate): void {
  qc.setQueryData<Estimate[]>(estimateKeys.list(), (old) => {
    const list = old ?? [];
    if (list.some((e) => e.id === estimate.id)) return list;
    return [estimate, ...list];
  });
}

function removeEstimateFromCache(qc: QueryClient, id: number): void {
  qc.setQueryData<Estimate[]>(estimateKeys.list(), (old) =>
    (old ?? []).filter((e) => e.id !== id),
  );
}

export function useEstimates(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<Estimate[]>({
    queryKey: estimateKeys.list(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${ESTIMATES.BASE}${params ? `?${params}` : ''}`);
      return unwrapList<Estimate>(data);
    },
    ...queryDefaults,
  });
}

export function useEstimate(id: number) {
  return useQuery<Estimate>({
    queryKey: estimateKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(ESTIMATES.BY_ID(id));
      return unwrapEntity<Estimate>(data);
    },
    enabled: Boolean(id),
    ...queryDefaults,
  });
}

export function useCreateEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, CreateEstimatePayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(ESTIMATES.BASE, payload);
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      prependEstimateToCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate created as draft');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to create estimate')),
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, { id: number; payload: UpdateEstimatePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.put(ESTIMATES.BY_ID(id), payload);
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      upsertEstimateInCache(qc, estimate);
      qc.setQueryData(estimateKeys.detail(estimate.id), estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate updated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to update estimate')),
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => { await axiosInstance.delete(ESTIMATES.BY_ID(id)); },
    onSuccess: (_, id) => {
      removeEstimateFromCache(qc, id);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate deleted');
    },
    onError: () => showToast('error', 'Failed to delete estimate'),
  });
}

export function useSendEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(ESTIMATES.SEND(id));
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      upsertEstimateInCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate sent to customer');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to send estimate')),
  });
}

export function useApproveEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, { id: number; approved_by_name?: string }>({
    mutationFn: async ({ id, approved_by_name }) => {
      const { data } = await axiosInstance.post(ESTIMATES.APPROVE(id), { approved_by_name });
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      upsertEstimateInCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate approved');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to approve estimate')),
  });
}

export function useRejectEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, { id: number; payload: RejectEstimatePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.post(ESTIMATES.REJECT(id), payload);
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      upsertEstimateInCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate rejected');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to reject estimate')),
  });
}

export type EmailEstimatePayload = {
  to: string;
  message?: string;
  customer_id?: number | null;
  contact_name?: string;
  contact_phone?: string;
};

export function useEmailEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, { id: number; payload: EmailEstimatePayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.post(ESTIMATES.EMAIL(id), payload);
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      upsertEstimateInCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate emailed');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to email estimate')),
  });
}

export function useDuplicateEstimate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Estimate, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(ESTIMATES.DUPLICATE(id));
      return unwrapEntity<Estimate>(data);
    },
    onSuccess: (estimate) => {
      prependEstimateToCache(qc, estimate);
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Estimate duplicated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to duplicate estimate')),
  });
}

export function useEstimateVersions(id: number) {
  return useQuery<EstimateVersion[]>({
    queryKey: estimateKeys.versions(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(ESTIMATES.VERSIONS(id));
      return unwrapList<EstimateVersion>(data);
    },
    enabled: Boolean(id),
    ...queryDefaults,
  });
}

export function useConvertEstimateToInvoice() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ConvertEstimateResult, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(ESTIMATES.CONVERT_INVOICE(id));
      return unwrapEntity<ConvertEstimateResult>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      showToast('success', 'Invoice created from estimate');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to convert to invoice')),
  });
}

export function useConvertEstimateToProject() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ConvertEstimateResult, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post(ESTIMATES.CONVERT_PROJECT(id));
      return unwrapEntity<ConvertEstimateResult>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: estimateKeys.all });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      showToast('success', 'Project created from estimate');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to convert to project')),
  });
}

export function useEstimateAnalytics(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<EstimateAnalytics>({
    queryKey: estimateKeys.analytics(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${ESTIMATES.ANALYTICS}${params ? `?${params}` : ''}`);
      return unwrapEntity<EstimateAnalytics>(data);
    },
    ...queryDefaults,
  });
}

export function useEstimateTemplates() {
  return useQuery<EstimateTemplate[]>({
    queryKey: estimateKeys.templates(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(ESTIMATES.TEMPLATES);
      return unwrapList<EstimateTemplate>(data);
    },
    placeholderData: (prev) => prev ?? [],
    ...queryDefaults,
  });
}

export function useEstimateTemplate(id: number) {
  return useQuery<EstimateTemplate>({
    queryKey: estimateKeys.template(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(ESTIMATES.TEMPLATE(id));
      return unwrapEntity<EstimateTemplate>(data);
    },
    enabled: Boolean(id),
    ...queryDefaults,
  });
}

export type CreateEstimateTemplatePayload = {
  name: string;
  description?: string | null;
  line_items_template: EstimateTemplate['line_items_template'];
  terms?: string | null;
  default_tax_rate?: number;
  is_active?: boolean;
};

export function useCreateEstimateTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<EstimateTemplate, AxiosError, CreateEstimateTemplatePayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(ESTIMATES.TEMPLATES, payload);
      return unwrapEntity<EstimateTemplate>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: estimateKeys.templates() });
      showToast('success', 'Template created');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to create template')),
  });
}

export function useUpdateEstimateTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<EstimateTemplate, AxiosError, { id: number; payload: Partial<CreateEstimateTemplatePayload> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.put(ESTIMATES.TEMPLATE(id), payload);
      return unwrapEntity<EstimateTemplate>(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: estimateKeys.templates() });
      showToast('success', 'Template updated');
    },
    onError: (e) => showToast('error', sanitizeErrorMessage(e, 'Failed to update template')),
  });
}

export function useDeleteEstimateTemplate() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => { await axiosInstance.delete(ESTIMATES.TEMPLATE(id)); },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: estimateKeys.templates() });
      showToast('success', 'Template deleted');
    },
    onError: () => showToast('error', 'Failed to delete template'),
  });
}
