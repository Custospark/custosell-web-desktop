import { getOfflineDb } from './offlineDb';
import type { CreateRoleData, Role, UpdateRoleData } from '../../../modules/settings/api/settings/RoleTypes';

export type LocalRoleSyncStatus = 'pending' | 'synced' | 'failed';

export type RoleMutationType = 'create' | 'update' | 'delete';

export interface LocalRoleRecord {
  localId: string;
  mutationId: string;
  mutationType: RoleMutationType;
  roleId: number;
  role: Role;
  payload: CreateRoleData | UpdateRoleData | { id: number };
  syncStatus: LocalRoleSyncStatus;
  serverId?: number;
  createdAt: string;
  syncedAt?: string;
  lastError?: string;
}

export type RoleWithSyncMeta = Role & {
  _pendingSync?: boolean;
  _syncFailed?: boolean;
  _lastError?: string;
  _mutationType?: RoleMutationType;
  _localId?: string;
};

export function toRoleWithSyncMeta(record: LocalRoleRecord): RoleWithSyncMeta {
  return {
    ...record.role,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _syncFailed: record.syncStatus === 'failed',
    _lastError: record.lastError,
    _mutationType: record.mutationType,
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localRolesStore = {
  async save(
    role: Role,
    payload: CreateRoleData | UpdateRoleData | { id: number },
    mutationId: string,
    mutationType: RoleMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalRoleRecord = {
      localId,
      mutationId,
      mutationType,
      roleId: role.id,
      role,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localRoles', record);
    return localId;
  },

  async getAll(): Promise<LocalRoleRecord[]> {
    const db = await getOfflineDb();
    return db.getAll('localRoles');
  },

  async getPending(): Promise<LocalRoleRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async getByLocalId(localId: string): Promise<LocalRoleRecord | null> {
    const db = await getOfflineDb();
    return (await db.get('localRoles', localId)) ?? null;
  },

  async getByRoleId(roleId: number): Promise<LocalRoleRecord | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    return all.find((r) => r.role.id === roleId || r.roleId === roleId) ?? null;
  },

  async updatePendingRecord(
    localId: string,
    role: Role,
    payload: CreateRoleData | UpdateRoleData | { id: number },
  ): Promise<LocalRoleRecord> {
    const db = await getOfflineDb();
    const record = await db.get('localRoles', localId);
    if (!record) {
      throw new Error('Local role record not found');
    }
    if (record.syncStatus === 'synced') {
      throw new Error('Synced role records cannot be updated');
    }

    record.role = role;
    record.roleId = role.id;
    record.payload = payload;
    record.syncStatus = 'pending';
    record.lastError = undefined;
    await db.put('localRoles', record);
    return record;
  },

  async markSyncedByMutationId(
    mutationId: string,
    serverId?: number,
    serverRole?: Partial<Role>,
  ): Promise<number | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return null;

    const oldId = record.role.id;
    record.syncStatus = 'synced';
    record.serverId = serverId;
    record.syncedAt = new Date().toISOString();
    if (serverRole) {
      record.role = { ...record.role, ...serverRole, id: serverId ?? record.role.id };
    } else if (serverId) {
      record.role = { ...record.role, id: serverId };
    }
    record.roleId = record.role.id;
    await db.put('localRoles', record);
    return oldId;
  },

  async markFailedByMutationId(mutationId: string, error?: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    record.lastError = error;
    await db.put('localRoles', record);
  },

  async removeSynced(): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    for (const record of all) {
      if (record.syncStatus === 'synced') {
        await db.delete('localRoles', record.localId);
      }
    }
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localRoles', record.localId);
    }
  },

  async removeByRoleId(roleId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localRoles');
    const record = all.find((r) => r.role.id === roleId);
    if (record) {
      await db.delete('localRoles', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
