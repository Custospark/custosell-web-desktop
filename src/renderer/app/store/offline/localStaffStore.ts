import { getOfflineDb } from './offlineDb';
import type { CreateStaffData, StaffUser, UpdateStaffData } from '../../../modules/settings/api/settings/StaffTypes';

export type LocalStaffSyncStatus = 'pending' | 'synced' | 'failed';

export type StaffMutationType = 'create' | 'update' | 'delete';

export interface LocalStaffRecord {
  localId: string;
  mutationId: string;
  mutationType: StaffMutationType;
  staffId: number;
  roleId: number;
  staff: StaffUser;
  payload: CreateStaffData | UpdateStaffData | { id: number };
  syncStatus: LocalStaffSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
}

export type StaffWithSyncMeta = StaffUser & {
  _pendingSync?: boolean;
  _localId?: string;
};

export function toStaffWithSyncMeta(record: LocalStaffRecord): StaffWithSyncMeta {
  return {
    ...record.staff,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localStaffStore = {
  async save(
    staff: StaffUser,
    payload: CreateStaffData | UpdateStaffData | { id: number },
    mutationId: string,
    mutationType: StaffMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalStaffRecord = {
      localId,
      mutationId,
      mutationType,
      staffId: staff.id,
      roleId: staff.role_id,
      staff,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localStaff', record);
    return localId;
  },

  async getAll(): Promise<LocalStaffRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localStaff');
  },

  async getPending(): Promise<LocalStaffRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverStaff?: Partial<StaffUser>,
  ): Promise<number | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return null;

    const oldId = record.staff.id;
    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverStaff) {
      record.staff = { ...record.staff, ...serverStaff, id: serverId ?? record.staff.id };
    } else if (serverId) {
      record.staff = { ...record.staff, id: serverId };
    }
    record.staffId = record.staff.id;
    record.roleId = record.staff.role_id;
    await db.put('localStaff', record);
    return oldId;
  },

  async markFailedByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    await db.put('localStaff', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localStaff', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localStaff', record.localId);
    }
  },

  async updateRoleIdInPending(oldRoleId: number, newRoleId: number): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    for (const record of all) {
      if (record.staff.role_id === oldRoleId) {
        record.staff.role_id = newRoleId;
        record.roleId = newRoleId;
        if (record.staff.role?.id === oldRoleId) {
          record.staff.role = { ...record.staff.role, id: newRoleId };
        }
        if (record.payload && typeof record.payload === 'object' && 'role_id' in record.payload) {
          (record.payload as Record<string, unknown>).role_id = newRoleId;
        }
        await db.put('localStaff', record);
      }
    }
  },

  async removeByStaffId(staffId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localStaff');
    const record = all.find((r) => r.staff.id === staffId);
    if (record) {
      await db.delete('localStaff', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
