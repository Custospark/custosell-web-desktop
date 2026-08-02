import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../api/axiosConfig';
import { CUSTOMERS, ROLES, USERS } from '../../../../shared/api/endpoints/endpoints';
import type { Product } from '../../../../modules/inventory/api/products/ProductTypes';
import type { Category } from '../../../../modules/inventory/api/products/ProductTypes';
import type { Customer } from '../../../../modules/customers/api/customers/CustomerTypes';
import type { Role } from '../../../../modules/settings/api/settings/RoleTypes';
import type { StaffUser } from '../../../../modules/settings/api/settings/StaffTypes';
import type { Location } from '../../../../modules/settings/api/settings/LocationTypes';
import { LOCATIONS } from '../../../../shared/api/endpoints/endpoints';
import { isOfflineMode } from '../core/offlineQueryUtils';
import { backupCatalogSnapshot, resolveAuthBusinessId } from './catalogSnapshotUtils';
import { serverCatalogStore, type ProductCatalogKind } from './serverCatalogStore';
import { refreshSalesCatalogSnapshotsForSession } from './salesCatalogSnapshot';
import { refreshExpensesCatalogSnapshotsForSession } from './expensesCatalogSnapshot';
import { refreshDashboardSummarySnapshot } from './dashboardCatalogSnapshot';
import { stockLedger } from '../inventory/stockLedger';
import { store } from '../../store';
import { canAccessModule } from '../../../../shared/utils/moduleAccess';

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload.filter(Boolean) as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: T[] }).data)) {
    return (payload as { data: T[] }).data.filter(Boolean);
  }
  return [];
}

export async function fetchProductsFromApi(): Promise<{ products: Product[]; catalogKind: ProductCatalogKind }> {
  try {
    const { data } = await axiosInstance.get('/products');
    return { products: normalizeList<Product>(data), catalogKind: 'full' };
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    if (status !== 403) throw err;
    const { data } = await axiosInstance.get('/products/active');
    return { products: normalizeList<Product>(data), catalogKind: 'active' };
  }
}

export function seedStockLedgerFromProducts(products: Product[]): void {
  if (!products.length) return;
  void stockLedger
    .seedFromProducts(products.map((p) => ({ id: p.id, quantity: p.stock_quantity })))
    .catch((err) => console.warn('[Catalog] Stock ledger seed failed:', err));
}

export function backupProductCatalog(
  businessId: number,
  catalogKind: ProductCatalogKind,
  products: Product[],
): void {
  backupCatalogSnapshot('products', businessId, products, catalogKind);
}

export async function refreshProductCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { products, catalogKind } = await fetchProductsFromApi();
    backupProductCatalog(businessId, catalogKind, products);
  } catch (err) {
    console.warn('[Catalog] Product snapshot refresh failed:', err);
  }
}

export async function refreshCategoryCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get('/categories');
    backupCatalogSnapshot('categories', businessId, normalizeList<Category>(data));
  } catch (err) {
    console.warn('[Catalog] Category snapshot refresh failed:', err);
  }
}

export async function refreshCustomerCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get(CUSTOMERS.BASE);
    backupCatalogSnapshot('customers', businessId, normalizeList<Customer>(data));
  } catch (err) {
    console.warn('[Catalog] Customer snapshot refresh failed:', err);
  }
}

export async function refreshRoleCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get<{ data: Role[] }>(ROLES.BASE);
    backupCatalogSnapshot('roles', businessId, normalizeList<Role>(data.data ?? data));
  } catch (err) {
    console.warn('[Catalog] Role snapshot refresh failed:', err);
  }
}

export async function refreshStaffCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get<{ data: StaffUser[] }>(USERS.BASE);
    backupCatalogSnapshot('staff', businessId, normalizeList<StaffUser>(data.data ?? data));
  } catch (err) {
    console.warn('[Catalog] Staff snapshot refresh failed:', err);
  }
}

export async function refreshLocationCatalogSnapshot(): Promise<void> {
  if (isOfflineMode()) return;
  const businessId = resolveAuthBusinessId();
  if (!businessId) return;
  try {
    const { data } = await axiosInstance.get<{ data: Location[] }>(LOCATIONS.BASE);
    backupCatalogSnapshot('locations', businessId, normalizeList<Location>(data.data ?? data));
  } catch (err) {
    console.warn('[Catalog] Location snapshot refresh failed:', err);
  }
}

export async function refreshAllServerCatalogSnapshots(): Promise<void> {
  const user = store.getState().auth.user;

  await Promise.all([
    canAccessModule(user, 'inventory') ? refreshProductCatalogSnapshot() : Promise.resolve(),
    canAccessModule(user, 'inventory') ? refreshCategoryCatalogSnapshot() : Promise.resolve(),
    refreshCustomerCatalogSnapshot(),
    refreshRoleCatalogSnapshot(),
    refreshStaffCatalogSnapshot(),
    canAccessModule(user, 'sales') ? refreshSalesCatalogSnapshotsForSession() : Promise.resolve(),
    canAccessModule(user, 'expenses') ? refreshExpensesCatalogSnapshotsForSession() : Promise.resolve(),
    canAccessModule(user, 'dashboard') ? refreshDashboardSummarySnapshot() : Promise.resolve(),
  ]);
}

export async function loadProductCatalogBaseline(businessId: number): Promise<Product[]> {
  const items = await serverCatalogStore.loadProducts(businessId);
  return (items ?? []) as Product[];
}

export async function loadCategoryCatalogBaseline(businessId: number): Promise<Category[]> {
  return (await serverCatalogStore.load<Category>('categories', businessId)) ?? [];
}

export async function loadCustomerCatalogBaseline(businessId: number): Promise<Customer[]> {
  return (await serverCatalogStore.load<Customer>('customers', businessId)) ?? [];
}

export async function loadRoleCatalogBaseline(businessId: number): Promise<Role[]> {
  return (await serverCatalogStore.load<Role>('roles', businessId)) ?? [];
}

export async function loadStaffCatalogBaseline(businessId: number): Promise<StaffUser[]> {
  return (await serverCatalogStore.load<StaffUser>('staff', businessId)) ?? [];
}

export async function loadLocationCatalogBaseline(businessId: number): Promise<Location[]> {
  return (await serverCatalogStore.load<Location>('locations', businessId)) ?? [];
}
