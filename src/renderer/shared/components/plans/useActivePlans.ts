import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { setPlans } from '../../../app/store/slices/authSlice';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLANS } from '../../api/endpoints/endpoints';
import type { Plan } from '../../types';

export function useActivePlans() {
  const dispatch = useAppDispatch();
  const slicePlans = useAppSelector((s) => s.auth.plans);
  const query = useQuery({
    queryKey: ['plans', 'active'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: Plan[] }>(`${PLANS}/active`);
      return data.data;
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
    initialData: slicePlans.length > 0 ? slicePlans : undefined,
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      dispatch(setPlans(query.data));
    }
  }, [dispatch, query.data]);

  return query;
}
