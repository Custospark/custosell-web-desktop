import { getOfflineDb } from '../core/offlineDb';
import { getActiveBusinessId, scopedStore } from '../core/businessScoping';
import type {
  GuideFeedbackCategory,
  GuideFeedbackMineDto,
} from '../../../../modules/guide/api/GuideTypes';

export type LocalGuideFeedbackSyncStatus = 'pending' | 'synced' | 'failed';

export interface CreateGuideFeedbackPayload {
  category: GuideFeedbackCategory;
  subject: string;
  body: string;
}

export interface LocalGuideFeedbackRecord {
  localId: string;
  businessId?: number;
  mutationId: string;
  feedback: GuideFeedbackMineDto;
  payload: CreateGuideFeedbackPayload;
  syncStatus: LocalGuideFeedbackSyncStatus;
  createdAt: string;
  syncedAt?: string;
  lastError?: string;
}

export type GuideFeedbackWithSyncMeta = GuideFeedbackMineDto & {
  _pendingSync?: boolean;
  _syncFailed?: boolean;
  _lastError?: string;
  _localId?: string;
};

export function toGuideFeedbackWithSyncMeta(record: LocalGuideFeedbackRecord): GuideFeedbackWithSyncMeta {
  return {
    ...record.feedback,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _syncFailed: record.syncStatus === 'failed',
    _lastError: record.lastError,
    _localId: record.localId,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localGuideFeedbackStore = {
  async save(
    feedback: GuideFeedbackMineDto,
    payload: CreateGuideFeedbackPayload,
    mutationId: string,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalGuideFeedbackRecord = {
      localId,
      businessId: getActiveBusinessId(),
      mutationId,
      feedback,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localGuideFeedback', record);
    return localId;
  },

  async getAll(): Promise<LocalGuideFeedbackRecord[]> {
    return scopedStore.getAll<LocalGuideFeedbackRecord>('localGuideFeedback');
  },

  async getPending(): Promise<LocalGuideFeedbackRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markFailedByMutationId(mutationId: string, error?: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localGuideFeedback');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    record.lastError = error;
    await db.put('localGuideFeedback', record);
  },

  async getByLocalId(localId: string): Promise<LocalGuideFeedbackRecord | undefined> {
    const db = await getOfflineDb();
    return db.get('localGuideFeedback', localId);
  },

  async removeByLocalId(localId: string): Promise<void> {
    const db = await getOfflineDb();
    await db.delete('localGuideFeedback', localId);
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localGuideFeedback');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localGuideFeedback', record.localId);
    }
  },
};
