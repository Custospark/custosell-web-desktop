import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';

export interface EfrisPublicStatus {
  enabled: boolean;
  configured: boolean;
  country: string;
  mode: string;
  environment: string;
  offline_mode: string;
  scope: {
    pos_sales: boolean;
    sales_invoices: boolean;
  };
  misconfigured: boolean;
}

export const efrisKeys = {
  all: ['efris'] as const,
  status: () => [...efrisKeys.all, 'status'] as const,
};

async function fetchEfrisStatus(): Promise<EfrisPublicStatus> {
  const { data } = await axiosInstance.get<EfrisPublicStatus>('/efris/status');
  return data;
}

/** Safe EFRIS flags for Tax settings — never returns credentials. */
export function useEfrisStatus() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);

  return useQuery({
    queryKey: efrisKeys.status(),
    queryFn: fetchEfrisStatus,
    enabled: !isOffline,
    staleTime: 60_000,
  });
}
