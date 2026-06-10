import { queryClient } from '../../api/axiosConfig';
import { store } from '../store';
import { serverCatalogStore, type CatalogEntity } from './serverCatalogStore';

export function resolveAuthBusinessId(): number | null {
  const user = store.getState().auth.user;
  const id = user?.business_id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

/** React Query cache first (in-session), then durable IDB snapshot for this business. */
export async function readCatalogBaseline<T>(
  entity: CatalogEntity,
  queryKey: readonly unknown[],
  loadFromIdb: (businessId: number) => Promise<T[] | null>,
): Promise<T[]> {
  const cached = queryClient.getQueryData<T[]>(queryKey) ?? [];
  const safeCached = cached.filter(Boolean) as T[];
  if (safeCached.length > 0) return safeCached;

  const businessId = resolveAuthBusinessId();
  if (!businessId) return [];

  try {
    const fromIdb = await loadFromIdb(businessId);
    return (fromIdb ?? []).filter(Boolean) as T[];
  } catch (err) {
    console.warn(`[Catalog] Failed to read ${entity} snapshot:`, err);
    return [];
  }
}

export function backupCatalogSnapshot<T>(
  entity: CatalogEntity,
  businessId: number,
  items: T[],
  catalogKind = 'default',
): void {
  void serverCatalogStore.save(entity, businessId, items, catalogKind).catch((err) => {
    console.warn(`[Catalog] Failed to backup ${entity} snapshot:`, err);
  });
}
