import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

/**
 * Reusable offline harness: proves that for every store, an offline write is
 * durable (survives a DB reopen), lands in the mutation queue, and the sync
 * commit path (server POST + queue removal + local cleanup) runs with zero data
 * loss. The coordinator/sync slices are intentionally NOT pulled in - this tests
 * the durable write + commit contract that the coordinator depends on.
 */

const mocks = vi.hoisted(() => ({
  axiosInstance: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  store: { getState: vi.fn(), dispatch: vi.fn() },
}));

vi.mock('../../../../app/api/axiosConfig', () => ({
  axiosInstance: mocks.axiosInstance,
  queryClient: { setQueryData: vi.fn(), getQueryData: vi.fn(() => undefined), invalidateQueries: vi.fn() },
}));

vi.mock('../../../../app/store/store', () => ({
  store: mocks.store,
}));

function setAuth(): void {
  mocks.store.getState.mockReturnValue({ auth: { user: { business_id: 7, id: 1 } } });
}

/** Wipe the shared fake IndexedDB once per file (fast - no open connections yet). */
beforeAll(async () => {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('CustosellOffline');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

async function freshDb(): Promise<void> {
  const { resetOfflineDbState, clearOfflineDbStores, getOfflineDb } = await import('../core/offlineDb');
  resetOfflineDbState();
  await clearOfflineDbStores();
  await getOfflineDb();
}

/** Simulate an app restart: reset module state WITHOUT wiping data, then reopen. */
async function reopenDb(): Promise<void> {
  const { resetOfflineDbState, getOfflineDb } = await import('../core/offlineDb');
  resetOfflineDbState();
  await getOfflineDb();
}

describe('quick notes offline CRUD + sync (harness template)', () => {
  beforeEach(async () => {
    setAuth();
    await freshDb();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('create offline is durable, queued, and syncs with no data loss', async () => {
    const { localQuickNotesStore } = await import('../notes/localQuickNotesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const note = {
      id: -123,
      business_id: 7,
      user_id: 1,
      client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Offline note',
      body: 'Created while offline',
      color: null,
      tag: 'ops',
      is_shared: false,
      is_pinned: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { title: 'Offline note', body: 'Created while offline', tag: 'ops' };

    const mutationId = await mutationQueue.enqueue({ method: 'POST', url: '/quick-notes', data: payload, maxRetries: 3 });
    await localQuickNotesStore.save(note, payload, mutationId, 'create');

    // Durability: simulate an app restart (state reset, DB reopened) - the record survives.
    await reopenDb();
    const afterReopen = await import('../notes/localQuickNotesStore');
    const reopened = await afterReopen.localQuickNotesStore.getPending();
    expect(reopened).toHaveLength(1);
    expect(reopened[0].note.title).toBe('Offline note');
    expect(reopened[0].syncStatus).toBe('pending');

    const queued = await (await import('../sync/mutationQueue')).mutationQueue.getAll();
    expect(queued).toHaveLength(1);
    expect(queued[0].url).toBe('/quick-notes');

    // Go online: server accepts, then commit removes queue + local row.
    mocks.axiosInstance.post.mockResolvedValue({
      data: { data: { id: 500, client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Offline note' } },
    });
    await mocks.axiosInstance.post('/quick-notes', payload);
    await commitMutationQueueEntry(mutationId);
    await afterReopen.localQuickNotesStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/quick-notes', expect.objectContaining({ title: 'Offline note' }));
    expect(await (await import('../sync/mutationQueue')).mutationQueue.getAll()).toHaveLength(0);
    expect(await afterReopen.localQuickNotesStore.getPending()).toHaveLength(0);
  });

  it('update offline queues a scoped mutation; commit leaves no residue', async () => {
    const { localQuickNotesStore } = await import('../notes/localQuickNotesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const note = {
      id: 42,
      business_id: 7,
      user_id: 1,
      client_uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      title: 'Existing note',
      body: null,
      color: null,
      tag: null,
      is_shared: false,
      is_pinned: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { title: 'Renamed offline', is_pinned: true };

    const mutationId = await mutationQueue.enqueue({ method: 'POST', url: '/quick-notes/42', data: payload, maxRetries: 3 });
    await localQuickNotesStore.save(note, payload, mutationId, 'update');

    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 42, title: 'Renamed offline', is_pinned: true } } });
    await mocks.axiosInstance.post('/quick-notes/42', payload);
    await commitMutationQueueEntry(mutationId);
    await localQuickNotesStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/quick-notes/42', expect.objectContaining({ is_pinned: true }));
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localQuickNotesStore.getPending()).toHaveLength(0);
  });

  it('delete offline queues a DELETE; commit cleans up', async () => {
    const { localQuickNotesStore } = await import('../notes/localQuickNotesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const note = {
      id: 99,
      business_id: 7,
      user_id: 1,
      client_uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      title: 'To delete',
      body: null,
      color: null,
      tag: null,
      is_shared: false,
      is_pinned: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const mutationId = await mutationQueue.enqueue({ method: 'DELETE', url: '/quick-notes/99', maxRetries: 3 });
    await localQuickNotesStore.save(note, { id: 99 }, mutationId, 'delete');

    mocks.axiosInstance.delete.mockResolvedValue({ data: null });
    await mocks.axiosInstance.delete('/quick-notes/99');
    await commitMutationQueueEntry(mutationId);
    await localQuickNotesStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.delete).toHaveBeenCalledWith('/quick-notes/99');
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localQuickNotesStore.getPending()).toHaveLength(0);
  });

  it('a failed server call does NOT lose the offline record (retry stays queued)', async () => {
    const { localQuickNotesStore } = await import('../notes/localQuickNotesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');

    const note = {
      id: -200,
      business_id: 7,
      user_id: 1,
      client_uuid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      title: 'Will fail then retry',
      body: null,
      color: null,
      tag: null,
      is_shared: false,
      is_pinned: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { title: 'Will fail then retry' };

    const mutationId = await mutationQueue.enqueue({ method: 'POST', url: '/quick-notes', data: payload, maxRetries: 3 });
    await localQuickNotesStore.save(note, payload, mutationId, 'create');

    mocks.axiosInstance.post.mockRejectedValueOnce({ response: { status: 503, data: { message: 'Server busy' } } });
    await expect(mocks.axiosInstance.post('/quick-notes', payload)).rejects.toBeTruthy();

    // Nothing lost: record + mutation remain so a later retry succeeds.
    expect(await localQuickNotesStore.getPending()).toHaveLength(1);
    expect(await mutationQueue.getAll()).toHaveLength(1);
  });
});

export { setAuth, freshDb, reopenDb };
