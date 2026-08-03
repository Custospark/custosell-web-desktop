import { queryClient } from '../../../api/axiosConfig';
import { purgeSyncedOptimisticFromCache } from './offlineCacheReconcile';
import { notifyItemCommitted } from './syncItemRefresh';
import { salesKeys } from '../../../../modules/sales/api/salesQueries';
import { dashboardKeys } from '../../../../modules/dashboard/DashboardQueries';
import { shiftKeys } from '../../../../modules/shifts/ShiftQueries';
import { inventoryKeys } from '../../../../modules/inventory/api/products/ProductQueries';
import { expenseKeys } from '../../../../shared/utils/expenseKeys';
import { guideKeys } from '../../../../modules/guide/api/GuideQueries';
import { orderKeys } from '../../../../modules/sales/api/orders/orderQueryKeys';
import { refreshAllServerCatalogSnapshots } from '../catalogs/catalogSnapshotRefresh';
import { refreshSalesCatalogSnapshotsForSession } from '../catalogs/salesCatalogSnapshot';

/** After a sale commits — drop local rows, refresh server snapshots, refetch sales UI. */
export async function refreshSalesUiAfterCommit(): Promise<void> {
  await notifyItemCommitted();
  await refreshSalesCatalogSnapshotsForSession();
  await queryClient.invalidateQueries({ queryKey: salesKeys.all });
  await queryClient.refetchQueries({ queryKey: salesKeys.all, type: 'active' });
  await queryClient.invalidateQueries({ queryKey: orderKeys.all, refetchType: 'active' });
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all, refetchType: 'active' });
  await queryClient.invalidateQueries({ queryKey: shiftKeys.all, refetchType: 'active' });
}

/** After each committed item — purge stale badges and refresh active list queries. */
export async function invalidateAfterItemCommitted(): Promise<void> {
  await notifyItemCommitted();
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: salesKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: orderKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: shiftKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: expenseKeys.all, refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['customers'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['roles'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['staff'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: ['business'], refetchType: 'active' }),
    queryClient.invalidateQueries({ queryKey: guideKeys.all, refetchType: 'active' }),
  ]);
}

/** @deprecated Use invalidateAfterItemCommitted — kept for sales batch call sites. */
export async function invalidateAfterSalesChunk(): Promise<void> {
  await refreshSalesUiAfterCommit();
}

/** @deprecated Use invalidateAfterItemCommitted — kept for expense sync call sites. */
export async function invalidateAfterExpenseChunk(): Promise<void> {
  await invalidateAfterItemCommitted();
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
  await queryClient.invalidateQueries({ queryKey: orderKeys.all });
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
