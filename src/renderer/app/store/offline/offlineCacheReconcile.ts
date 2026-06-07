import type { QueryClient } from '@tanstack/react-query';
import { localSalesStore } from './localSalesStore';
import { localRefundsStore } from './localRefundsStore';
import { localShiftsStore, type ShiftRecord, type ShiftWithSyncMeta } from './localShiftsStore';
import { localProductsStore, type ProductWithSyncMeta } from './localProductsStore';
import { localCategoriesStore, type CategoryWithSyncMeta } from './localCategoriesStore';
import { localCustomersStore, type CustomerWithSyncMeta } from './localCustomersStore';
import { localExpensesStore } from './localExpensesStore';
import { localExpenseCategoriesStore } from './localExpenseCategoriesStore';
import { localRolesStore, type RoleWithSyncMeta } from './localRolesStore';
import { localStaffStore, type StaffWithSyncMeta } from './localStaffStore';
import { localBusinessSettingsStore, type BusinessWithSyncMeta } from './localBusinessSettingsStore';
import type { SaleWithSyncMeta } from './localSalesStore';
import type { ExpenseCategoryWithSyncMeta, ExpenseWithSyncMeta } from '../../../modules/expenses/api/ExpenseTypes';

/** Query key literals — avoid importing from query modules (circular deps). */
const SALES_LIST_KEY = ['sales', 'list'] as const;
const SHIFTS_SALES_PREFIX = ['shifts', 'sales'] as const;
const SHIFTS_ACTIVE_KEY = ['shifts', 'active'] as const;
const SHIFTS_LIST_KEY = ['shifts', 'list'] as const;
const DASHBOARD_SUMMARY_KEY = ['dashboard', 'summary'] as const;
const DASHBOARD_SERVER_KEY = ['dashboard', 'server'] as const;
const ROLES_LIST_KEY = ['roles', 'list'] as const;
const STAFF_LIST_KEY = ['staff', 'list'] as const;
const BUSINESS_MINE_KEY = ['business', 'mine'] as const;

/** Local-only sale row — not yet confirmed on server. */
export function isOptimisticSale(sale: SaleWithSyncMeta): boolean {
  return Boolean(
    sale._pendingSync ||
    sale._localId ||
    sale.id < 0 ||
    (sale.receipt_number?.startsWith('OFF-') ?? false),
  );
}

export function stripSaleSyncMeta(sale: SaleWithSyncMeta): SaleWithSyncMeta {
  const cleaned = { ...sale };
  delete cleaned._pendingSync;
  delete cleaned._pendingRefundSync;
  delete cleaned._localId;
  return cleaned;
}

export function reconcileSaleList(
  sales: SaleWithSyncMeta[],
  pendingSaleIds: Set<number>,
  pendingSaleReceipts: Set<string>,
  pendingRefundSaleIds: Set<number>,
): SaleWithSyncMeta[] {
  return sales
    .filter((s) => {
      if (pendingSaleIds.has(s.id) || pendingSaleReceipts.has(s.receipt_number)) {
        return true;
      }
      return !isOptimisticSale(s);
    })
    .map((s) => {
      const row = { ...s };
      const isPendingSale =
        pendingSaleIds.has(s.id) || pendingSaleReceipts.has(s.receipt_number);

      if (!isPendingSale) {
        delete row._pendingSync;
        delete row._localId;
      }
      if (!pendingRefundSaleIds.has(s.id)) {
        delete row._pendingRefundSync;
      }
      return row;
    });
}

/**
 * Remove synced optimistic rows from React Query cache so UI never shows stale pending badges.
 * Call after a successful queue drain, before refetching server data.
 */
export async function purgeSyncedOptimisticFromCache(qc: QueryClient): Promise<void> {
  const [pendingSales, pendingRefunds, pendingShifts] = await Promise.all([
    localSalesStore.getPending(),
    localRefundsStore.getPending(),
    localShiftsStore.getPending(),
  ]);

  const pendingSaleIds = new Set(pendingSales.map((r) => r.sale.id));
  const pendingSaleReceipts = new Set(pendingSales.map((r) => r.sale.receipt_number));
  const pendingRefundSaleIds = new Set(pendingRefunds.map((r) => r.saleId));
  const pendingShiftIds = new Set(pendingShifts.map((r) => r.shiftId));

  const reconcile = (list: SaleWithSyncMeta[]) =>
    reconcileSaleList(list, pendingSaleIds, pendingSaleReceipts, pendingRefundSaleIds);

  qc.setQueryData<SaleWithSyncMeta[]>(SALES_LIST_KEY, (old) => reconcile(old ?? []));

  const shiftSalesQueries = qc.getQueriesData<SaleWithSyncMeta[]>({
    queryKey: SHIFTS_SALES_PREFIX,
  });
  for (const [key, data] of shiftSalesQueries) {
    if (Array.isArray(data)) {
      qc.setQueryData(key, reconcile(data));
    }
  }

  qc.setQueryData<ShiftRecord | null>(SHIFTS_ACTIVE_KEY, (old) => {
    if (!old) return old;
    const shift = old as ShiftWithSyncMeta;
    if (shift._pendingSync && !pendingShiftIds.has(shift.id)) {
      return null;
    }
    if (!shift._pendingSync) return old;
    return old;
  });

  qc.setQueryData<ShiftRecord[]>(SHIFTS_LIST_KEY, (old) => {
    if (!old) return old;
    return old.filter((s) => {
      const meta = s as ShiftWithSyncMeta;
      if (!meta._pendingSync) return true;
      return pendingShiftIds.has(s.id);
    });
  });

  /** ── Strip sync meta from products and categories ── */
  const pendingProducts = await localProductsStore.getPending();
  const pendingProductIds = new Set(pendingProducts.map((r) => r.product.id));

  qc.setQueryData<ProductWithSyncMeta[]>(['inventory', 'products'], (old) => {
    if (!old) return old;
    return old.filter((p) => {
      if (!pendingProductIds.has(p.id) && (p._pendingSync || p._localId || p.id < 0)) return false;
      return true;
    }).map((p) => {
      if (p._pendingSync && !pendingProductIds.has(p.id)) {
        const cleaned = { ...p };
        delete cleaned._pendingSync;
        delete cleaned._localId;
        return cleaned;
      }
      return p;
    });
  });

  const pendingCategories = await localCategoriesStore.getPending();
  const pendingCategoryIds = new Set(pendingCategories.map((r) => r.category.id));

  qc.setQueryData<CategoryWithSyncMeta[]>(['inventory', 'categories'], (old) => {
    if (!old) return old;
    return old.filter((c) => {
      if (!pendingCategoryIds.has(c.id) && (c._pendingSync || c._localId || c.id < 0)) return false;
      return true;
    }).map((c) => {
      if (c._pendingSync && !pendingCategoryIds.has(c.id)) {
        const cleaned = { ...c };
        delete cleaned._pendingSync;
        delete cleaned._localId;
        return cleaned;
      }
      return c;
    });
  });

  /** ── Strip sync meta from customers ── */
  const pendingCustomers = await localCustomersStore.getPending();
  const pendingCustomerIds = new Set(pendingCustomers.map((r) => r.customer.id));

  qc.setQueryData<CustomerWithSyncMeta[]>(['customers', 'customers'], (old) => {
    if (!old) return old;
    return old.filter((c) => {
      if (!pendingCustomerIds.has(c.id) && (c._pendingSync || c._localId || c.id < 0)) return false;
      return true;
    }).map((c) => {
      if (c._pendingSync && !pendingCustomerIds.has(c.id)) {
        const cleaned = { ...c };
        delete cleaned._pendingSync;
        delete cleaned._localId;
        return cleaned;
      }
      return c;
    });
  });

  qc.removeQueries({ queryKey: DASHBOARD_SUMMARY_KEY });
  qc.removeQueries({ queryKey: DASHBOARD_SERVER_KEY });

  /** ── Strip sync meta from expenses and expense categories ── */
  const pendingExpenses = await localExpensesStore.getPending();
  const pendingExpenseIds = new Set(pendingExpenses.map((r) => r.expense.id));

  const expenseListQueries = qc.getQueriesData<ExpenseWithSyncMeta[]>({
    queryKey: ['expenses', 'list'],
  });
  for (const [key, data] of expenseListQueries) {
    if (!Array.isArray(data)) continue;
    qc.setQueryData<ExpenseWithSyncMeta[]>(
      key,
      data.filter(Boolean).filter((expense) => {
        if (!pendingExpenseIds.has(expense.id) && (expense._pendingSync || expense._localId || expense.id < 0)) {
          return false;
        }
        return true;
      }),
    );
  }

  const pendingExpenseCategories = await localExpenseCategoriesStore.getPending();
  const pendingExpenseCategoryIds = new Set(pendingExpenseCategories.map((r) => r.category.id));

  qc.setQueryData<ExpenseCategoryWithSyncMeta[]>(['expenses', 'categories'], (old) => {
    if (!old) return old;
    return old.filter(Boolean).filter((category) => {
      if (
        !pendingExpenseCategoryIds.has(category.id)
        && (category._pendingSync || category._localId || category.id < 0)
      ) {
        return false;
      }
      return true;
    });
  });

  /** ── Strip sync meta from settings rows ── */
  const pendingRoles = await localRolesStore.getPending();
  const pendingRoleIds = new Set(pendingRoles.map((r) => r.role.id));

  qc.setQueryData<RoleWithSyncMeta[]>(ROLES_LIST_KEY, (old) => {
    if (!old) return old;
    return old.filter(Boolean).filter((role) => {
      if (!pendingRoleIds.has(role.id) && (role._pendingSync || role._localId || role.id < 0)) {
        return false;
      }
      return true;
    });
  });

  const pendingStaff = await localStaffStore.getPending();
  const pendingStaffIds = new Set(pendingStaff.map((r) => r.staff.id));

  qc.setQueryData<StaffWithSyncMeta[]>(STAFF_LIST_KEY, (old) => {
    if (!old) return old;
    return old.filter(Boolean).filter((staff) => {
      if (!pendingStaffIds.has(staff.id) && (staff._pendingSync || staff._localId || staff.id < 0)) {
        return false;
      }
      return true;
    });
  });

  const pendingBusiness = await localBusinessSettingsStore.getLatestPending();

  qc.setQueryData<BusinessWithSyncMeta>(BUSINESS_MINE_KEY, (old) => {
    if (!old) return old;
    if (pendingBusiness && pendingBusiness.business.id === old.id) {
      return old;
    }
    if (old._pendingSync || old._localId) {
      const cleaned = { ...old };
      delete cleaned._pendingSync;
      delete cleaned._localId;
      return cleaned;
    }
    return old;
  });
}
