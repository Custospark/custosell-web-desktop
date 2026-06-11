import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import type { Sale } from '../../../../modules/sales/api/salesTypes';
import { backupCatalogSnapshot, resolveAuthBusinessId } from './catalogSnapshotUtils';
import { serverCatalogStore } from './serverCatalogStore';
import { isOfflineMode } from '../core/offlineQueryUtils';

export const salesCatalogKinds = {
  list: 'list',
  shift: (shiftId: number) => `shift:${shiftId}`,
  daily: (date: string) => `daily:${date}`,
} as const;

function normalizeSalesList(payload: unknown): Sale[] {
  if (Array.isArray(payload)) return payload as Sale[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: Sale[] }).data)) {
    return (payload as { data: Sale[] }).data;
  }
  return [];
}

export function backupSalesListSnapshot(businessId: number, sales: Sale[]): void {
  backupCatalogSnapshot('sales', businessId, sales, salesCatalogKinds.list);
}

export function backupShiftSalesSnapshot(businessId: number, shiftId: number, sales: Sale[]): void {
  backupCatalogSnapshot('sales', businessId, sales, salesCatalogKinds.shift(shiftId));
}

export function backupDailySalesSnapshot(businessId: number, date: string, sales: Sale[]): void {
  backupCatalogSnapshot('sales', businessId, sales, salesCatalogKinds.daily(date));
}

export async function loadSalesListBaseline(businessId: number): Promise<Sale[]> {
  return (await serverCatalogStore.load<Sale>('sales', businessId, salesCatalogKinds.list)) ?? [];
}

export async function loadShiftSalesBaseline(businessId: number, shiftId: number): Promise<Sale[]> {
  return (
    (await serverCatalogStore.load<Sale>('sales', businessId, salesCatalogKinds.shift(shiftId))) ?? []
  );
}

export async function loadDailySalesBaseline(businessId: number, date: string): Promise<Sale[]> {
  const daily = await serverCatalogStore.load<Sale>('sales', businessId, salesCatalogKinds.daily(date));
  if (daily && daily.length > 0) return daily;

  const list = await loadSalesListBaseline(businessId);
  return list.filter((s) => s.sale_date.slice(0, 10) === date);
}

export async function refreshSalesListSnapshot(): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || isOfflineMode()) return;
  try {
    const { data } = await axiosInstance.get('/sales');
    backupSalesListSnapshot(businessId, normalizeSalesList(data));
  } catch (err) {
    console.warn('[SalesCatalog] List snapshot refresh failed:', err);
  }
}

export async function refreshShiftSalesSnapshot(shiftId: number): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || !shiftId || shiftId < 0 || isOfflineMode()) return;
  try {
    const { data } = await axiosInstance.get<{ data: Sale[] }>(`/sales/by-shift/${shiftId}`);
    backupShiftSalesSnapshot(businessId, shiftId, data.data ?? []);
  } catch (err) {
    console.warn('[SalesCatalog] Shift snapshot refresh failed:', err);
  }
}

export async function refreshDailySalesSnapshot(date: string): Promise<void> {
  const businessId = resolveAuthBusinessId();
  if (!businessId || isOfflineMode()) return;
  try {
    const params = `?date=${date}`;
    const { data } = await axiosInstance.get(`/sales/daily${params}`);
    backupDailySalesSnapshot(businessId, date, normalizeSalesList(data));
  } catch (err) {
    console.warn('[SalesCatalog] Daily snapshot refresh failed:', err);
  }
}

/** Full sales list plus active shift sales when clocked in. */
export async function refreshSalesCatalogSnapshotsForSession(): Promise<void> {
  await refreshSalesListSnapshot();
  const shiftId = store.getState().auth.user?.shift_id;
  if (typeof shiftId === 'number' && shiftId > 0) {
    await refreshShiftSalesSnapshot(shiftId);
  }
}
