import { getOfflineDb } from '../core/offlineDb';

export type LocalShiftSyncStatus = 'pending' | 'synced' | 'failed';
export type LocalShiftOperation = 'open' | 'close';

export interface ShiftRecord {
  id: number;
  business_id: number;
  user_id: number;
  clock_in: string;
  clock_out: string | null;
  total_sales: string;
  total_cash: string;
  total_mobile_money: string;
  total_card: string;
  status: 'active' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalShiftRecord {
  localId: string;
  mutationId: string;
  shiftId: number;
  operation: LocalShiftOperation;
  shift: ShiftRecord;
  syncStatus: LocalShiftSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type ShiftWithSyncMeta = ShiftRecord & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toShiftWithSyncMeta(record: LocalShiftRecord): ShiftWithSyncMeta {
  return {
    ...record.shift,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localShiftsStore = {
  async saveOpen(shift: ShiftRecord, mutationId: string): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalShiftRecord = {
      localId,
      mutationId,
      shiftId: shift.id,
      operation: 'open',
      shift,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localShifts', record);
    return localId;
  },

  async saveClose(shift: ShiftRecord, mutationId: string): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalShiftRecord = {
      localId,
      mutationId,
      shiftId: shift.id,
      operation: 'close',
      shift,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localShifts', record);
    return localId;
  },

  async getAll(): Promise<LocalShiftRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localShifts');
  },

  async getPending(): Promise<LocalShiftRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async getActivePending(): Promise<LocalShiftRecord | null> {
    const pending = await this.getPending();
    const opens = pending.filter((r) => r.operation === 'open' && r.shift.status === 'active');
    return opens.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  },

  async getByMutationId(mutationId: string): Promise<LocalShiftRecord | undefined> {
    const all = await this.getAll();
    return all.find((r) => r.mutationId === mutationId);
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverShift?: Partial<ShiftRecord>,
  ): Promise<number | undefined> {
    const db = await getOfflineDb();
    const all = await db.getAll('localShifts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return undefined;

    const oldShiftId = record.shiftId;
    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverId) {
      record.shiftId = serverId;
      record.shift = { ...record.shift, ...serverShift, id: serverId };
    }
    await db.put('localShifts', record);
    return oldShiftId;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localShifts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localShifts', record);
  },

  async removeByMutationId(mutationId: string): Promise<LocalShiftRecord | undefined> {
    const db = await getOfflineDb();
    const all = await db.getAll('localShifts');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localShifts', record.localId);
    }
    return record;
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localShifts');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localShifts', record.localId);
      }
    }
  },

  async getPendingCompleted(): Promise<ShiftWithSyncMeta[]> {
    const pending = await this.getPending();
    return pending
      .filter((r) => r.operation === 'close')
      .map(toShiftWithSyncMeta)
      .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
  },
};
