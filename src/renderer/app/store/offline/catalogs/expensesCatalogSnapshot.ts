import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import type { Expense, ExpenseCategory } from '../../../../modules/expenses/api/ExpenseTypes';
import { backupCatalogSnapshot, resolveAuthBusinessId } from './catalogSnapshotUtils';
import { serverCatalogStore } from './serverCatalogStore';
import { isOfflineMode } from '../core/offlineQueryUtils';

export const expensesCatalogKinds = {
  list: 'list',
  shift: (shiftId: number) => `shift:${shiftId}`,
} as const;

function normalizeExpenseList(payload: unknown): Expense[] {
  if (Array.isArray(payload)) return payload.filter(Boolean) as Expense[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: Expense[] }).data)) {
    return (payload as { data: Expense[] }).data.filter(Boolean);
  }
  return [];
}

function normalizeCategoryList(payload: unknown): ExpenseCategory[] {
  if (Array.isArray(payload)) return payload.filter(Boolean) as ExpenseCategory[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: ExpenseCategory[] }).data)) {
    return (payload as { data: ExpenseCategory[] }).data.filter(Boolean);
  }
  return [];
}

export function backupExpensesListSnapshot(businessId: number, expenses: Expense[]): void {
  backupCatalogSnapshot('expenses', businessId, expenses, expensesCatalogKinds.list);
}

export function backupShiftExpensesSnapshot(businessId: number, shiftId: number, expenses: Expense[]): void {
  backupCatalogSnapshot('expenses', businessId, expenses, expensesCatalogKinds.shift(shiftId));
}

export function backupExpenseCategoriesSnapshot(businessId: number, categories: ExpenseCategory[]): void {
  backupCatalogSnapshot('expenseCategories', businessId, categories);
}

export async function loadExpensesListBaseline(businessId: number): Promise<Expense[]> {
  return (await serverCatalogStore.load<Expense>('expenses', businessId, expensesCatalogKinds.list)) ?? [];
}

export async function loadShiftExpensesBaseline(businessId: number, shiftId: number): Promise<Expense[]> {
  const shiftScoped =
    (await serverCatalogStore.load<Expense>('expenses', businessId, expensesCatalogKinds.shift(shiftId))) ?? [];
  if (shiftScoped.length > 0) return shiftScoped;

  const list = await loadExpensesListBaseline(businessId);
  return list.filter((expense) => expense.shift_id === shiftId);
}

export async function loadExpenseCategoriesBaseline(businessId: number): Promise<ExpenseCategory[]> {
  return (await serverCatalogStore.load<ExpenseCategory>('expenseCategories', businessId)) ?? [];
}

export async function refreshExpensesListSnapshot(): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || isOfflineMode()) return;
  try {
    const { data } = await axiosInstance.get('/expenses');
    backupExpensesListSnapshot(businessId, normalizeExpenseList(data));
  } catch (err) {
    console.warn('[ExpensesCatalog] List snapshot refresh failed:', err);
  }
}

export async function refreshShiftExpensesSnapshot(shiftId: number): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || !shiftId || shiftId < 0 || isOfflineMode()) return;
  try {
    const { data } = await axiosInstance.get<{ data?: Expense[] }>(`/expenses?shift_id=${shiftId}`);
    backupShiftExpensesSnapshot(businessId, shiftId, normalizeExpenseList(data));
  } catch (err) {
    console.warn('[ExpensesCatalog] Shift snapshot refresh failed:', err);
  }
}

export async function refreshExpenseCategoriesSnapshot(): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || isOfflineMode()) return;
  try {
    const { data } = await axiosInstance.get('/expense-categories');
    backupExpenseCategoriesSnapshot(businessId, normalizeCategoryList(data));
  } catch (err) {
    console.warn('[ExpensesCatalog] Category snapshot refresh failed:', err);
  }
}

/** Full expense list, categories, and active shift expenses when clocked in. */
export async function refreshExpensesCatalogSnapshotsForSession(): Promise<void> {
  await Promise.all([refreshExpensesListSnapshot(), refreshExpenseCategoriesSnapshot()]);
  const shiftId = store.getState().auth.user?.shift_id;
  if (typeof shiftId === 'number' && shiftId > 0) {
    await refreshShiftExpensesSnapshot(shiftId);
  }
}
