import { useQuery } from '@tanstack/react-query';
import { axiosInstance, queryClient } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import { applyDashboardPendingOverlay } from '../../app/store/offline/sales/offlineSalesSummary';
import { readWithOfflineStrategy } from '../../app/store/offline/core/offlineReadStrategy';
import { isCompletelyOffline, isNetworkFailure } from '../../app/store/offline/core/offlineQueryUtils';
import {
  backupDashboardSummarySnapshot,
  loadDashboardSummaryBaseline,
} from '../../app/store/offline/catalogs/dashboardCatalogSnapshot';
import { resolveAuthBusinessId } from '../../app/store/offline/catalogs/catalogSnapshotUtils';
import { REPORTS } from '../../shared/api/endpoints/endpoints';
import type { DashboardSummary, BranchPerformanceResponse } from './DashboardTypes';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  /** Server-only baseline — never merged with offline overlay. */
  server: () => [...dashboardKeys.all, 'server'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  branchPerformance: () => [...dashboardKeys.all, 'branch-performance'] as const,
};

const emptySummary = (): DashboardSummary => ({
  today_revenue: 0,
  today_gross_sales: 0,
  today_refunds: 0,
  today_net_after_refunds: 0,
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
  today_vat: null,
});

async function resolveDashboardServerBaseline(): Promise<DashboardSummary> {
  const cached = queryClient.getQueryData<DashboardSummary>(dashboardKeys.server());
  if (cached) return cached;

  const businessId = resolveAuthBusinessId();
  if (businessId) {
    const fromIdb = await loadDashboardSummaryBaseline(businessId);
    if (fromIdb) return fromIdb;
  }

  return emptySummary();
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return readWithOfflineStrategy({
    readFromClient: async () => {
      const server = await resolveDashboardServerBaseline();
      return applyDashboardPendingOverlay(server);
    },
    fetchFromServer: async () => {
      const { data } = await axiosInstance.get<DashboardSummary>('/dashboard/summary');
      queryClient.setQueryData(dashboardKeys.server(), data);
      const businessId = resolveAuthBusinessId();
      if (businessId) {
        backupDashboardSummarySnapshot(businessId, data);
      }
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

export function useBranchPerformance(dateFrom: string, dateTo: string) {
  return useQuery<BranchPerformanceResponse>({
    queryKey: [...dashboardKeys.branchPerformance(), dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BranchPerformanceResponse }>(REPORTS.BRANCH_PERFORMANCE, {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return data.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

function filenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = header.match(/filename="?([^";\n]+)"?/i);
  return match?.[1] ?? fallback;
}

export function useReportDownload() {
  const { showToast } = useToast();
  return async (endpoint: string, params: URLSearchParams, fallbackFilename: string) => {
    if (isCompletelyOffline()) {
      showToast('error', 'Connect to the internet to download reports');
      return;
    }
    try {
      showToast('success', 'Downloading report...');
      const { data, headers, status } = await axiosInstance.get(endpoint, {
        params,
        responseType: 'blob',
        validateStatus: (s) => s < 500,
      });

      const responseHeaders = headers as Record<string, string>;
      const contentType = responseHeaders['content-type'] || 'application/octet-stream';

      if (status >= 400 || contentType.includes('application/json')) {
        const text = await (data as Blob).text();
        try {
          const json = JSON.parse(text) as { message?: string };
          showToast('error', json.message || 'Failed to download report');
        } catch {
          showToast('error', 'Failed to download report');
        }
        return;
      }

      const disposition = responseHeaders['content-disposition'];
      const filename = filenameFromDisposition(disposition, fallbackFilename);
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
