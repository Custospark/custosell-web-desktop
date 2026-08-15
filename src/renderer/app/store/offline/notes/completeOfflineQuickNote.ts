import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localQuickNotesStore } from './localQuickNotesStore';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { QUICK_NOTES } from '../../../../shared/api/endpoints/quickNotesEndpoints';
import type {
  QuickNote,
  QuickNoteMutationType,
  QuickNotePayload,
  QuickNoteWithSyncMeta,
} from '../../../../modules/notes/api/QuickNoteTypes';

export function shouldCompleteQuickNoteLocally(): boolean {
  return shouldCompleteMutationLocally();
}

function newClientUuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function authUser() {
  return store.getState().auth.user;
}

export function buildLocalQuickNote(payload: QuickNotePayload): QuickNoteWithSyncMeta {
  const now = new Date().toISOString();
  const user = authUser();

  const note: QuickNote = {
    id: -Date.now(),
    business_id: user?.business_id ?? 0,
    user_id: user?.id ?? 0,
    client_uuid: newClientUuid(),
    title: payload.title ?? '',
    body: payload.body ?? null,
    color: payload.color ?? null,
    tag: payload.tag ?? null,
    is_shared: Boolean(payload.is_shared),
    is_pinned: Boolean(payload.is_pinned),
    sort_order: payload.sort_order ?? 0,
    created_at: now,
    updated_at: now,
  };

  return { ...note, _pendingSync: true };
}

export async function persistOfflineQuickNoteInBackground(
  note: QuickNoteWithSyncMeta,
  payload: QuickNotePayload | { id: number },
  mutationType: QuickNoteMutationType,
): Promise<void> {
  let mutationId: string | undefined;
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url: string = QUICK_NOTES.BASE;

  if (mutationType === 'update') {
    method = 'PUT';
    url = QUICK_NOTES.ITEM(note.id);
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = QUICK_NOTES.ITEM((payload as { id: number }).id);
  }

  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineQuickNote] Enqueue failed:', err);
    return;
  }

  if (!mutationId) return;

  try {
    const localId = await localQuickNotesStore.save(note, payload, mutationId, mutationType);
    note._localId = localId;
  } catch (err) {
    console.error('[OfflineQuickNote] Local store save failed:', err);
    await mutationQueue.remove(mutationId).catch(() => undefined);
  }
}

export function completeOfflineCreateQuickNoteInstant(payload: QuickNotePayload): QuickNoteWithSyncMeta {
  const note = buildLocalQuickNote(payload);
  const persist = persistOfflineQuickNoteInBackground(note, payload, 'create').catch((err) => {
    console.error('[OfflineQuickNote] Background persist failed:', err);
  });
  trackWrite(persist);
  return note;
}

export function completeOfflineUpdateQuickNoteInstant(
  note: QuickNote,
  data: QuickNotePayload,
): QuickNoteWithSyncMeta {
  const updated: QuickNoteWithSyncMeta = {
    ...note,
    title: data.title ?? note.title,
    body: data.body ?? note.body,
    color: data.color ?? note.color,
    tag: data.tag ?? note.tag,
    is_shared: data.is_shared ?? note.is_shared,
    is_pinned: data.is_pinned ?? note.is_pinned,
    sort_order: data.sort_order ?? note.sort_order,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  const persist = persistOfflineQuickNoteInBackground(updated, data, 'update').catch((err) => {
    console.error('[OfflineQuickNote] Background persist failed:', err);
  });
  trackWrite(persist);
  return updated;
}

export function completeOfflineDeleteQuickNoteInstant(id: number): void {
  const persist = persistOfflineQuickNoteInBackground({ id } as QuickNoteWithSyncMeta, { id }, 'delete').catch((err) => {
    console.error('[OfflineQuickNote] Background persist failed:', err);
  });
  trackWrite(persist);
}
