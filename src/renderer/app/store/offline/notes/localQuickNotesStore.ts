import { getOfflineDb } from '../core/offlineDb';
import { getActiveBusinessId, scopedStore } from '../core/businessScoping';
import type {
  LocalQuickNoteRecord,
  QuickNote,
  QuickNoteMutationType,
  QuickNotePayload,
  QuickNoteWithSyncMeta,
} from '../../../../modules/notes/api/QuickNoteTypes';

export function toQuickNoteWithSyncMeta(record: LocalQuickNoteRecord): QuickNoteWithSyncMeta {
  return {
    ...record.note,
    _pendingSync: record.syncStatus === 'pending' || record.syncStatus === 'failed',
    _localId: record.localId,
    _lastError: record.lastError,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export const localQuickNotesStore = {
  async save(
    note: QuickNote,
    payload: QuickNotePayload | { id: number },
    mutationId: string,
    mutationType: QuickNoteMutationType,
  ): Promise<string> {
    const db = await getOfflineDb();
    const localId = newLocalId();
    const record: LocalQuickNoteRecord = {
      localId,
      businessId: getActiveBusinessId(),
      mutationId,
      mutationType,
      note,
      payload,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    await db.add('localQuickNotes', record);
    return localId;
  },

  async getAll(): Promise<LocalQuickNoteRecord[]> {
    return scopedStore.getAll<LocalQuickNoteRecord>('localQuickNotes');
  },

  async getPending(): Promise<LocalQuickNoteRecord[]> {
    const all = await this.getAll();
    return all.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');
  },

  async markFailedByMutationId(mutationId: string, error?: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localQuickNotes');
    const record = all.find((r) => r.mutationId === mutationId);
    if (!record) return;
    record.syncStatus = 'failed';
    record.lastError = error;
    await db.put('localQuickNotes', record);
  },

  async removeByMutationId(mutationId: string): Promise<void> {
    const db = await getOfflineDb();
    const all = await db.getAll('localQuickNotes');
    const record = all.find((r) => r.mutationId === mutationId);
    if (record) {
      await db.delete('localQuickNotes', record.localId);
    }
  },

  async removeByNoteId(noteId: number): Promise<string | null> {
    const db = await getOfflineDb();
    const all = await db.getAll('localQuickNotes');
    const record = all.find((r) => r.note.id === noteId);
    if (record) {
      await db.delete('localQuickNotes', record.localId);
      return record.mutationId;
    }
    return null;
  },
};
