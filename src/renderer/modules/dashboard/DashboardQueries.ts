import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import type { DashboardSummary } from './DashboardTypes';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DashboardSummary>('/dashboard/summary');
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useReportDownload() {
  const { showToast } = useToast();
  return async (endpoint: string, params: URLSearchParams, filename: string) => {
    try {
      showToast('success', 'Downloading report...');
      const { data, headers } = await axiosInstance.get(endpoint, {
        params,
        responseType: 'blob',
      });
      const contentType = (headers as any)['content-type'] || 'application/octet-stream';
      const blob = new Blob([data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Failed to download report');
    }
  };
}
