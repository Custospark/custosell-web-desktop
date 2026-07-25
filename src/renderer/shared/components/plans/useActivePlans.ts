import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLANS } from '../../api/endpoints/endpoints';
import type { Plan } from '../../types';

export function useActivePlans() {
  const slicePlans = useAppSelector((s) => s.auth.plans);
  return useQuery({
    queryKey: ['plans', 'active'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(`${PLANS}/active`);
      return data.data;
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
    initialData: slicePlans.length > 0 ? slicePlans : undefined,
  });
}
