import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { CURRENCY } from '../endpoints/endpoints';

interface ConvertResponse {
  success: boolean;
  data: {
    amount: number;
    from: string;
    to: string;
    converted: number | null;
    rate: number | null;
  };
}

export function useCurrencyConvert(amount: number, from: string, to: string) {
  return useQuery({
    queryKey: ['currency', 'convert', amount, from, to],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConvertResponse>(CURRENCY.CONVERT, {
        params: { amount, from, to },
      });
      return data.data;
    },
    enabled: amount > 0 && !!from && !!to && from !== to,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}
