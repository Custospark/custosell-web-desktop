import { queryClient } from '../../app/api/axiosConfig';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '../../modules/dashboard/DashboardQueries';
import { shiftKeys } from '../../modules/shifts/ShiftQueries';
import type {
  Expense,
  ExpenseCategory,
  ExpenseSummary,
  ExpenseWithSyncMeta,
  ExpenseCategoryWithSyncMeta,
} from '../../modules/expenses/api/ExpenseTypes';
import { expenseKeys } from './expenseKeys';

export type QueryClientLike = ReturnType<typeof useQueryClient>;

export function mergeExpenseLists(base: Expense[] = [], local: ExpenseWithSyncMeta[] = []): ExpenseWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Expense[];
  const safeLocal = local.filter(Boolean) as ExpenseWithSyncMeta[];
  const localIds = new Set(safeLocal.map((expense) => expense.id));
  const filtered = safeBase.filter((expense) => !localIds.has(expense.id));
  return [...safeLocal, ...filtered] as ExpenseWithSyncMeta[];
}

export function matchesExpenseFilters(expense: ExpenseWithSyncMeta, filters?: Record<string, string>): boolean {
  if (!filters) return true;
  if (filters.category_id && String(expense.expense_category_id ?? '') !== filters.category_id) return false;
  if (filters.shift_id && String(expense.shift_id ?? '') !== filters.shift_id) return false;
  if (filters.location_id && String(expense.location_id ?? '') !== filters.location_id) return false;
  const expenseDate = (expense.expense_date ?? '').slice(0, 10);
  if (filters.date_from && expenseDate < filters.date_from.slice(0, 10)) return false;
  if (filters.date_to && expenseDate > filters.date_to.slice(0, 10)) return false;
  return true;
}

export function mergeExpenseCategoryLists(
  base: ExpenseCategory[] = [],
  local: ExpenseCategoryWithSyncMeta[] = [],
): ExpenseCategoryWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as ExpenseCategory[];
  const safeLocal = local.filter(Boolean) as ExpenseCategoryWithSyncMeta[];
  const localIds = new Set(safeLocal.map((category) => category.id));
  const localNames = new Set(safeLocal.map((category) => category.name));
  const filtered = safeBase.filter((category) => !localIds.has(category.id) && !localNames.has(category.name));
  return [...safeLocal, ...filtered] as ExpenseCategoryWithSyncMeta[];
}

export function sanitizeExpenseList(list: ExpenseWithSyncMeta[] = []): ExpenseWithSyncMeta[] {
  return list.filter(Boolean) as ExpenseWithSyncMeta[];
}

export function sanitizeExpenseCategoryList(
  list: ExpenseCategoryWithSyncMeta[] = [],
): ExpenseCategoryWithSyncMeta[] {
  return list.filter(Boolean) as ExpenseCategoryWithSyncMeta[];
}

export function getAllExpenseListQueries(qc: QueryClientLike) {
  return qc.getQueriesData<ExpenseWithSyncMeta[]>({ queryKey: [...expenseKeys.all, 'list'] });
}

export function patchExpenseLists(
  qc: QueryClientLike,
  patch: (old: ExpenseWithSyncMeta[]) => ExpenseWithSyncMeta[],
): void {
  const queries = getAllExpenseListQueries(qc);
  for (const [key, data] of queries) {
    qc.setQueryData<ExpenseWithSyncMeta[]>(key, sanitizeExpenseList(patch(sanitizeExpenseList(data ?? []))));
  }
  if (queries.length === 0) {
    qc.setQueryData<ExpenseWithSyncMeta[]>(expenseKeys.list(), sanitizeExpenseList(patch([])));
  }
}

export function patchShiftExpenseCache(
  qc: QueryClientLike,
  shiftId: number | null | undefined,
  patch: (old: ExpenseWithSyncMeta[]) => ExpenseWithSyncMeta[],
): void {
  if (!shiftId) return;
  qc.setQueryData<ExpenseWithSyncMeta[]>(
    shiftKeys.expenses(shiftId),
    (old) => sanitizeExpenseList(patch(sanitizeExpenseList(old ?? []))),
  );
}

function invalidateDashboardQueries(qc: QueryClientLike): void {
  void qc.invalidateQueries({ queryKey: dashboardKeys.summary() });
  void qc.invalidateQueries({ queryKey: dashboardKeys.branchPerformance() });
}

export function applyExpenseOptimisticUpdates(
  qc: QueryClientLike,
  expense: ExpenseWithSyncMeta,
  mode: 'create' | 'update',
  previousShiftId?: number | null,
): void {
  if (mode === 'create') {
    patchExpenseLists(qc, (old) => {
      if (old.some((item) => item.id === expense.id)) return old;
      return [expense, ...old];
    });
    patchShiftExpenseCache(qc, expense.shift_id, (old) => {
      if (old.some((item) => item.id === expense.id)) return old;
      return [expense, ...old];
    });
  } else {
    patchExpenseLists(qc, (old) => old.map((item) => (item.id === expense.id ? expense : item)));
    const shiftIds = new Set(
      [expense.shift_id, previousShiftId].filter((id): id is number => typeof id === 'number'),
    );
    for (const shiftId of shiftIds) {
      patchShiftExpenseCache(qc, shiftId, (old) =>
        old.map((item) => (item.id === expense.id ? expense : item)),
      );
    }
  }

  qc.setQueryData(expenseKeys.detail(expense.id), expense);
  void qc.invalidateQueries({ queryKey: [...expenseKeys.all, 'summary'] });
  invalidateDashboardQueries(qc);
}

export function applyExpenseDeleteOptimisticUpdates(
  qc: QueryClientLike,
  expenseId: number,
  shiftId: number | null | undefined,
): void {
  patchExpenseLists(qc, (old) => old.filter((expense) => expense.id !== expenseId));
  patchShiftExpenseCache(qc, shiftId, (old) => old.filter((expense) => expense.id !== expenseId));
  void qc.invalidateQueries({ queryKey: [...expenseKeys.all, 'summary'] });
  invalidateDashboardQueries(qc);
}

export function findCachedExpense(id: number): ExpenseWithSyncMeta | undefined {
  const lists = queryClient.getQueriesData<ExpenseWithSyncMeta[]>({ queryKey: [...expenseKeys.all, 'list'] });
  for (const [, data] of lists) {
    const match = sanitizeExpenseList(data ?? []).find((expense) => expense.id === id);
    if (match) return match;
  }
  return queryClient.getQueryData<ExpenseWithSyncMeta>(expenseKeys.detail(id));
}

export function summarizeExpenses(expenses: ExpenseWithSyncMeta[]): ExpenseSummary {
  const byCategory = new Map<number | null, { category_id: number | null; category_name: string; total: number; count: number }>();
  let totalAmount = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount) || 0;
    totalAmount += amount;
    const key = expense.expense_category_id ?? null;
    const current = byCategory.get(key) ?? {
      category_id: key,
      category_name: expense.expense_category?.name ?? 'Uncategorized',
      total: 0,
      count: 0,
    };
    current.total += amount;
    current.count += 1;
    byCategory.set(key, current);
  }

  return {
    total_amount: totalAmount,
    total_count: expenses.length,
    by_category: Array.from(byCategory.values()),
  };
}

export function mergeLocalExpensesIntoSummary(summary: ExpenseSummary, local: ExpenseWithSyncMeta[]): ExpenseSummary {
  if (local.length === 0) return summary;
  const merged = {
    ...summary,
    by_category: summary.by_category.map((item) => ({ ...item })),
  };

  for (const expense of local) {
    const amount = Number(expense.amount) || 0;
    merged.total_amount += amount;
    merged.total_count += 1;

    const categoryId = expense.expense_category_id ?? null;
    const existing = merged.by_category.find((item) => item.category_id === categoryId);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      merged.by_category.push({
        category_id: categoryId,
        category_name: expense.expense_category?.name ?? 'Uncategorized',
        total: amount,
        count: 1,
      });
    }
  }

  return merged;
}

export function invalidateExpenseDashboard(qc: QueryClientLike): void {
  invalidateDashboardQueries(qc);
}