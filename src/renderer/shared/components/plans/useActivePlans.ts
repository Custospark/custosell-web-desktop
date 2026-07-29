import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLANS } from '../../api/endpoints/endpoints';
import type { Plan } from '../../types';

export function useActivePlans() {
  return useQuery({
    queryKey: ['plans', 'active'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(`${PLANS}/active`);
      return data.data;
    },
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}
