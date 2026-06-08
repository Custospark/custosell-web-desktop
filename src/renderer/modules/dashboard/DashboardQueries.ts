import { useQuery } from '@tanstack/react-query';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import { applyDashboardPendingOverlay } from '../../app/store/offline/offlineSalesSummary';
import { readWithOfflineStrategy } from '../../app/store/offline/offlineReadStrategy';
import { isCompletelyOffline, isNetworkFailure } from '../../app/store/offline/offlineQueryUtils';
import type { DashboardSummary } from './DashboardTypes';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  /** Server-only baseline — never merged with offline overlay. */
  server: () => [...dashboardKeys.all, 'server'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

const emptySummary = (): DashboardSummary => ({
  today_revenue: 0,
  today_gross_sales: 0,
  today_refunds: 0,
  today_net_sales: 0,
  today_transactions: 0,
  today_products_sold: 0,
  today_expenses: 0,
  today_net_after_expenses: 0,
  active_products: 0,
  total_customers: 0,
  sales_trend: [],
  low_stock: [],
  recent_sales: [],
});

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return readWithOfflineStrategy({
    readFromClient: async () => {
      const server =
        queryClient.getQueryData<DashboardSummary>(dashboardKeys.server()) ?? emptySummary();
      return applyDashboardPendingOverlay(server);
    },
    fetchFromServer: async () => {
      const { data } = await axiosInstance.get<DashboardSummary>('/dashboard/summary', {
        timeout: 10000,
      });
      queryClient.setQueryData(dashboardKeys.server(), data);
      return applyDashboardPendingOverlay(data);
    },
  });
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboardSummary,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useReportDownload() {
  const { showToast } = useToast();
  return async (endpoint: string, params: URLSearchParams, filename: string) => {
    if (isCompletelyOffline()) {
      showToast('error', 'Connect to the internet to download reports');
      return;
    }
    try {
      showToast('success', 'Downloading report...');
      const { data, headers } = await axiosInstance.get(endpoint, {
        params,
        responseType: 'blob',
      });
      const contentType = (headers as Record<string, string>)['content-type'] || 'application/octet-stream';
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
