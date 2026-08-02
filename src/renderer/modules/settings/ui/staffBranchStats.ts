import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import type { Location } from '../api/settings/LocationTypes';
import type { StaffTransfer } from '../api/settings/StaffTypes';

export const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export interface BranchStat {
  id: number | null;
  name: string;
  count: number;
  isDefault?: boolean;
}

export interface TransferSummary {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

export function buildBranchStats(staff: StaffWithSyncMeta[] | undefined, locations: Location[] | undefined): BranchStat[] {
  const safeStaff = (staff ?? []).filter(Boolean);
  const safeLocations = (locations ?? []).filter(Boolean);
  const byId = new Map(safeLocations.map((l) => [l.id, l]));
  const counts = new Map<number | null, number>();
  for (const s of safeStaff) {
    const id = s.location_id ?? null;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const stats: BranchStat[] = [];
  for (const [id, count] of counts) {
    const loc = id != null ? byId.get(id) : undefined;
    stats.push({
      id,
      name: loc?.name ?? (id == null ? 'Unassigned' : `Branch #${id}`),
      count,
      isDefault: loc?.is_default,
    });
  }
  return stats.sort((a, b) => b.count - a.count);
}

export function buildTransferSummary(transfers: StaffTransfer[] | undefined): TransferSummary {
  const safe = (transfers ?? []).filter(Boolean);
  return {
    total: safe.length,
    completed: safe.filter((t) => t.status === 'completed').length,
    pending: safe.filter((t) => t.status === 'pending').length,
    cancelled: safe.filter((t) => t.status === 'cancelled').length,
  };
}
