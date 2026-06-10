import { queryClient } from '../../api/axiosConfig';
import { purgeSyncedOptimisticFromCache } from './offlineCacheReconcile';
import { salesKeys } from '../../../modules/sales/api/salesQueries';
import { dashboardKeys } from '../../../modules/dashboard/DashboardQueries';
import { shiftKeys } from '../../../modules/shifts/ShiftQueries';
import { inventoryKeys } from '../../../modules/inventory/api/products/ProductQueries';
import { expenseKeys } from '../../../modules/expenses/api/ExpenseQueries';
import { guideKeys } from '../../../modules/guide/api/GuideQueries';
import { refreshAllServerCatalogSnapshots } from './catalogSnapshotRefresh';

/** After each sales chunk — strip stale pending badges, then refresh lists. */
export async function invalidateAfterSalesChunk(): Promise<void> {
  await purgeSyncedOptimisticFromCache(queryClient);
  await queryClient.invalidateQueries({ queryKey: salesKeys.all });
  await queryClient.invalidateQueries({ queryKey: shiftKeys.all });
}

/** After tier 2 completes — dashboard + inventory. */
export async function invalidateAfterTransactionsTier(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  await refreshAllServerCatalogSnapshots();
}

/** Full refresh once sync run finishes. */
export async function invalidateAfterFullSync(): Promise<void> {
  await purgeSyncedOptimisticFromCache(queryClient);
  await refreshAllServerCatalogSnapshots();
  await queryClient.invalidateQueries({ queryKey: salesKeys.all });
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  await queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['customers'] });
  await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['roles'] });
  await queryClient.invalidateQueries({ queryKey: ['staff'] });
  await queryClient.invalidateQueries({ queryKey: ['business'] });
  await queryClient.invalidateQueries({ queryKey: guideKeys.all });
}
