import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { BUSINESSES } from '../../../../shared/api/endpoints/endpoints';
import type { Business, UpdateBusinessData } from './BusinessTypes';
import { setBusiness } from '../../../../app/store/slices/authSlice';
import { useAppDispatch } from '../../../../app/store/hooks/useApp';

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'mine'] as const,
};

export function useBusiness() {
  return useQuery<Business>({
    queryKey: businessKeys.mine(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Business }>(BUSINESSES.MINE);
      return response.data;
    },
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  return useMutation<Business, AxiosError<ApiError>, UpdateBusinessData>({
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.put<{ data: Business }>(BUSINESSES.PROFILE, data);
      return response.data;
    },
    onSuccess: (business) => {
      dispatch(setBusiness(business));
    },
    onError: (e) => {
      showToast('error', e.response?.data?.message || 'Failed to update business settings');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: businessKeys.mine() }),
  });
}
