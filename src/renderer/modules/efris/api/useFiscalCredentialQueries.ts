import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import type { ApiError } from '../../../shared/api/account/AccountTypes';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { FiscalCredential } from './fiscalCredentialTypes';

export const fiscalCredentialKeys = {
  all: ['fiscal-credentials'] as const,
  list: () => [...fiscalCredentialKeys.all, 'list'] as const,
};

function extractRows(raw: unknown): FiscalCredential[] {
  if (Array.isArray(raw)) return raw as FiscalCredential[];
  if (raw && typeof raw === 'object') {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data as FiscalCredential[];
    if (data && typeof data === 'object') {
      const nested = (data as { data?: unknown }).data;
      if (Array.isArray(nested)) return nested as FiscalCredential[];
    }
  }
  return [];
}

export function useFiscalCredentials() {
  return useQuery({
    queryKey: fiscalCredentialKeys.list(),
    queryFn: async (): Promise<FiscalCredential[]> => {
      const { data } = await axiosInstance.get('/fiscal-credentials');
      return extractRows(data);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

function useInvalidateCredentials() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: fiscalCredentialKeys.list() });
  };
}

export function useCreateFiscalCredential() {
  const { showToast } = useToast();
  const invalidate = useInvalidateCredentials();
  return useMutation<FiscalCredential, AxiosError<ApiError>, Record<string, unknown>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post('/fiscal-credentials', payload);
      return (data?.data ?? data) as FiscalCredential;
    },
    onSuccess: () => {
      invalidate();
      showToast('success', 'Fiscal credentials saved');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not save fiscal credentials'));
    },
  });
}

export function useUpdateFiscalCredential() {
  const { showToast } = useToast();
  const invalidate = useInvalidateCredentials();
  return useMutation<FiscalCredential, AxiosError<ApiError>, { id: number; payload: Record<string, unknown> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axiosInstance.put(`/fiscal-credentials/${id}`, payload);
      return (data?.data ?? data) as FiscalCredential;
    },
    onSuccess: () => {
      invalidate();
      showToast('success', 'Fiscal credentials updated');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update fiscal credentials'));
    },
  });
}

export function useDeleteFiscalCredential() {
  const { showToast } = useToast();
  const invalidate = useInvalidateCredentials();
  return useMutation<void, AxiosError<ApiError>, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(`/fiscal-credentials/${id}`);
    },
    onSuccess: () => {
      invalidate();
      showToast('success', 'Fiscal credentials removed');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not remove fiscal credentials'));
    },
  });
}
