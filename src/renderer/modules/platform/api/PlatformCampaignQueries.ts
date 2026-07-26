import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import { useToast } from '../../../app/contexts/ToastContext';
import type { CampaignCode, CampaignCodeUsage } from './PlatformTypes';

export const campaignKeys = {
  all: ['platform', 'campaign-codes'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (params?: Record<string, string>) => [...campaignKeys.lists(), params] as const,
  detail: (id: number) => [...campaignKeys.all, 'detail', id] as const,
};

const freshQuery = { staleTime: 0, gcTime: 0, networkMode: 'always' as const };

export function useCampaignCodes(params?: Record<string, string>) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: CampaignCode[] }>(PLATFORM.CAMPAIGN_CODES, { params });
      return data.data;
    },
    ...freshQuery,
  });
}

export function useCampaignCode(id: number) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: CampaignCode }>(PLATFORM.CAMPAIGN_CODE(id));
      return data.data;
    },
    ...freshQuery,
  });
}

export function useCampaignCodeUsage(id: number) {
  return useQuery({
    queryKey: [...campaignKeys.detail(id), 'usage'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: CampaignCodeUsage }>(PLATFORM.CAMPAIGN_CODE_USAGE(id));
      return data.data;
    },
    enabled: !!id,
    ...freshQuery,
  });
}

export function useCreateCampaignCode() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ data: CampaignCode }, AxiosError<{ message: string }>, Partial<CampaignCode>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: CampaignCode }>(PLATFORM.CAMPAIGN_CODES, payload);
      return data;
    },
    onSuccess: () => {
      showToast('success', 'Campaign code created');
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to create campaign code');
    },
  });
}

export function useUpdateCampaignCode() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ data: CampaignCode }, AxiosError<{ message: string }>, { id: number; data: Partial<CampaignCode> }>({
    mutationFn: async ({ id, data }) => {
      const { data: res } = await axiosInstance.put<{ data: CampaignCode }>(PLATFORM.CAMPAIGN_CODE(id), data);
      return res;
    },
    onSuccess: () => {
      showToast('success', 'Campaign code updated');
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update campaign code');
    },
  });
}

export function useDeleteCampaignCode() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, AxiosError<{ message: string }>, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(PLATFORM.CAMPAIGN_CODE(id));
    },
    onSuccess: () => {
      showToast('success', 'Campaign code deleted');
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to delete campaign code');
    },
  });
}
