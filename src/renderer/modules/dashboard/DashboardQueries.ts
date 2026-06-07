import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { store } from '../../app/store/store';
import { useToast } from '../../app/contexts/useToast';
import { computeOfflineSalesSummary, mergeDashboardWithOffline } from '../../app/store/offline/offlineSalesSummary';
import type { DashboardSummary } from './DashboardTypes';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

function isOfflineMode(): boolean {
  const state = store.getState();
  return (state as { network?: { systemStatus?: string } }).network?.systemStatus === 'offline';
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const offline = await computeOfflineSalesSummary();

  if (isOfflineMode()) {
    const cached = queryClient.getQueryData<DashboardSummary>(dashboardKeys.summary());
    if (cached) return mergeDashboardWithOffline(cached, offline);
    return mergeDashboardWithOffline(
      {
        today_revenue: 0,
        today_transactions: 0,
        today_products_sold: 0,
        today_expenses: 0,
        active_products: 0,
        total_customers: 0,
        sales_trend: [],
        low_stock: [],
        recent_sales: [],
      },
      offline,
    );
  }

  try {
    const { data } = await axiosInstance.get<DashboardSummary>('/dashboard/summary');
    return mergeDashboardWithOffline(data, offline);
  } catch (err: unknown) {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) throw err;
    const cached = queryClient.getQueryData<DashboardSummary>(dashboardKeys.summary());
    if (!cached) throw err;
    return mergeDashboardWithOffline(cached, offline);
  }
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboardSummary,
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
