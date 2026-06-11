import { axiosInstance } from '../../../api/axiosConfig';
import type { DashboardSummary } from '../../../../modules/dashboard/DashboardTypes';
import { backupCatalogSnapshot, resolveAuthBusinessId } from './catalogSnapshotUtils';
import { serverCatalogStore } from './serverCatalogStore';
import { isOfflineMode } from '../core/offlineQueryUtils';

const DASHBOARD_SUMMARY_KIND = 'summary';

export function backupDashboardSummarySnapshot(businessId: number, summary: DashboardSummary): void {
  backupCatalogSnapshot('dashboard', businessId, [summary], DASHBOARD_SUMMARY_KIND);
}

export async function loadDashboardSummaryBaseline(businessId: number): Promise<DashboardSummary | null> {
  const items = await serverCatalogStore.load<DashboardSummary>(
    'dashboard',
    businessId,
    DASHBOARD_SUMMARY_KIND,
  );
  return items?.[0] ?? null;
}

export async function refreshDashboardSummarySnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get<DashboardSummary>('/dashboard/summary', {
      timeout: 10000,
    });
    backupDashboardSummarySnapshot(businessId, data);
  } catch (err) {
    console.warn('[DashboardCatalog] Summary snapshot refresh failed:', err);
  }
}
