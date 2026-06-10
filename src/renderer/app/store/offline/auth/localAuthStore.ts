import type { BusinessRegisterRequest } from '../../../../shared/api/account/AccountTypes';
import type { AuthUser } from '../../slices/authSlice';
import { getOfflineDb } from '../core/offlineDb';
import { normalizeAuthEmail } from './passwordVerifier';

export type LocalAuthKind = 'pending_registration' | 'device_login';
export type LocalAuthSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface LocalAuthRecord {
  localId: string;
  kind: LocalAuthKind;
  email: string;
  normalizedEmail: string;
  passwordVerifier: string;
  registrationPayload?: BusinessRegisterRequest;
  userSnapshot?: AuthUser;
  syncStatus: LocalAuthSyncStatus;
  mutationId?: string;
  localBusinessId?: number;
  localUserId?: number;
  serverBusinessId?: number;
  serverUserId?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localAuthStore = {
  async savePendingRegistration(input: {
    email: string;
    passwordVerifier: string;
    registrationPayload: BusinessRegisterRequest;
    mutationId: string;
    localBusinessId: number;
    localUserId: number;
    userSnapshot: AuthUser;
  }): Promise<string> {
    const db = await getOfflineDb();
    const now = new Date().toISOString();
    const localId = newLocalId();
    const record: LocalAuthRecord = {
      localId,
      kind: 'pending_registration',
      email: input.email,
      normalizedEmail: normalizeAuthEmail(input.email),
      passwordVerifier: input.passwordVerifier,
      registrationPayload: input.registrationPayload,
      userSnapshot: input.userSnapshot,
      syncStatus: 'pending',
      mutationId: input.mutationId,
      localBusinessId: input.localBusinessId,
      localUserId: input.localUserId,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('localAuth', record);
    return localId;
  },

  async saveDeviceLogin(input: {
    email: string;
    passwordVerifier: string;
    userSnapshot: AuthUser;
    serverBusinessId: number | null;
    serverUserId: number;
  }): Promise<void> {
    const db = await getOfflineDb();
    const normalizedEmail = normalizeAuthEmail(input.email);
    const all = await db.getAll('localAuth');
    const existing = all.find((r) => r.normalizedEmail === normalizedEmail && r.kind === 'device_login');
    const now = new Date().toISOString();

    const record: LocalAuthRecord = existing ?? {
      localId: newLocalId(),
      kind: 'device_login',
      email: input.email,
      normalizedEmail,
      passwordVerifier: input.passwordVerifier,
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
    };

    record.passwordVerifier = input.passwordVerifier;
    record.userSnapshot = input.userSnapshot;
    record.serverBusinessId = input.serverBusinessId ?? undefined;
    record.serverUserId = input.serverUserId;
    record.syncStatus = 'synced';
    record.updatedAt = now;
    await db.put('localAuth', record);
  },

  async getByEmail(email: string): Promise<LocalAuthRecord | undefined> {
    const db = await getOfflineDb();
    const normalizedEmail = normalizeAuthEmail(email);
    const all = await db.getAll('localAuth');
    const matches = all.filter((r) => r.normalizedEmail === normalizedEmail);
    if (matches.length === 0) return undefined;
    return (
      matches.find((r) => r.kind === 'pending_registration' && (r.syncStatus === 'pending' || r.syncStatus === 'failed'))
      ?? matches.find((r) => r.kind === 'device_login')
      ?? matches[0]
    );
  },

  async getPendingByEmail(email: string): Promise<LocalAuthRecord | undefined> {
    const db = await getOfflineDb();
    const normalizedEmail = normalizeAuthEmail(email);
    const all = await db.getAll('localAuth');
    return all.find(
      (r) =>
        r.normalizedEmail === normalizedEmail
        && r.kind === 'pending_registration'
        && (r.syncStatus === 'pending' || r.syncStatus === 'failed'),
    );
  },

  async updatePendingCredentials(input: {
    email: string;
    passwordVerifier: string;
    userSnapshot: AuthUser;
  }): Promise<void> {
    const db = await getOfflineDb();
    const record = await this.getPendingByEmail(input.email);
    if (!record) return;

    record.passwordVerifier = input.passwordVerifier;
    record.userSnapshot = input.userSnapshot;
    record.updatedAt = new Date().toISOString();
    await db.put('localAuth', record);
  },

  async updateUserSnapshot(email: string, userSnapshot: AuthUser): Promise<void> {
    const db = await getOfflineDb();
    const normalizedEmail = normalizeAuthEmail(email);
    const all = await db.getAll('localAuth');
    const now = new Date().toISOString();

    for (const record of all) {
      if (record.normalizedEmail !== normalizedEmail) continue;
      record.userSnapshot = userSnapshot;
      record.serverBusinessId = userSnapshot.business_id ?? record.serverBusinessId;
      record.serverUserId = userSnapshot.id;
      record.updatedAt = now;
      await db.put('localAuth', record);
    }
  },

  async getPending(): Promise<LocalAuthRecord[]> {
    const db = await getOfflineDb();
    const all = await db.getAll('localAuth');
    return all.filter((r) => r.kind === 'pending_registration' && (r.syncStatus === 'pending' || r.syncStatus === 'failed'));
  },

  async getByMutationId(mutationId: string): Promise<LocalAuthRecord | undefined> {
    const db = await getOfflineDb();
    const all = await db.getAll('localAuth');
    return all.find((r) => r.mutationId === mutationId);
  },

  async markSyncing(localId: string): Promise<void> {
    const db = await getOfflineDb();
    const record = await db.get('localAuth', localId);
    if (!record) return;
    record.syncStatus = 'syncing';
    record.updatedAt = new Date().toISOString();
    await db.put('localAuth', record);
  },

  async markSynced(localId: string, serverBusinessId: number, serverUserId: number, userSnapshot: AuthUser): Promise<void> {
    const db = await getOfflineDb();
    const record = await db.get('localAuth', localId);
    if (!record) return;
    record.kind = 'device_login';
    record.syncStatus = 'synced';
    record.serverBusinessId = serverBusinessId;
    record.serverUserId = serverUserId;
    record.userSnapshot = userSnapshot;
    record.registrationPayload = undefined;
    record.mutationId = undefined;
    record.lastError = undefined;
    record.updatedAt = new Date().toISOString();
    await db.put('localAuth', record);
  },

  async markFailed(localId: string, error: string): Promise<void> {
    const db = await getOfflineDb();
    const record = await db.get('localAuth', localId);
    if (!record) return;
    record.syncStatus = 'failed';
    record.lastError = error;
    record.updatedAt = new Date().toISOString();
    await db.put('localAuth', record);
  },

  async removePendingByEmail(email: string): Promise<void> {
    const record = await this.getPendingByEmail(email);
    if (!record) return;
    const db = await getOfflineDb();
    await db.delete('localAuth', record.localId);
  },

  async removeByEmail(email: string): Promise<void> {
    const db = await getOfflineDb();
    const normalizedEmail = normalizeAuthEmail(email);
    const all = await db.getAll('localAuth');
    for (const record of all) {
      if (record.normalizedEmail === normalizedEmail) {
        await db.delete('localAuth', record.localId);
      }
    }
  },

  async hasPendingAuth(): Promise<boolean> {
    const pending = await this.getPending();
    return pending.length > 0;
  },
};
