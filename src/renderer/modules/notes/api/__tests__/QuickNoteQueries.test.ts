import { describe, expect, it } from 'vitest';
import {
  canShareQuickNotes,
  canUseQuickNotes,
  mergeQuickNotes,
} from '../QuickNoteQueries';
import type { QuickNote, QuickNoteWithSyncMeta } from '../QuickNoteTypes';

/**
 * Locks the Quick Notes offline-first behaviour:
 *  - personal + business accounts can use the feature; storefront buyers cannot
 *  - sharing is available on business accounts (owner + staff), not personal
 *  - server + local-pending notes merge deduped by client_uuid (temp negative
 *    ids never duplicate a note that already synced)
 */

function serverNote(overrides: Partial<QuickNote>): QuickNote {
  return {
    id: 1,
    business_id: 1,
    user_id: 1,
    client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Server note',
    body: null,
    color: null,
    tag: null,
    is_shared: false,
    is_pinned: false,
    sort_order: 0,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    ...overrides,
  };
}

function pendingNote(overrides: Partial<QuickNoteWithSyncMeta> = {}): QuickNoteWithSyncMeta {
  return {
    id: -Date.now(),
    business_id: 1,
    user_id: 1,
    client_uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    title: 'Pending note',
    body: 'Created offline',
    color: 'blue',
    tag: null,
    is_shared: false,
    is_pinned: false,
    sort_order: 0,
    created_at: '2026-01-01T09:00:00Z',
    updated_at: '2026-01-01T09:00:00Z',
    _pendingSync: true,
    ...overrides,
  };
}

describe('account-type gates', () => {
  it('personal + business accounts can use quick notes', () => {
    expect(canUseQuickNotes('personal')).toBe(true);
    expect(canUseQuickNotes('business')).toBe(true);
  });

  it('storefront buyers cannot use quick notes', () => {
    expect(canUseQuickNotes('storefront_buyer')).toBe(false);
  });

  it('business accounts can share; personal cannot', () => {
    expect(canShareQuickNotes('business')).toBe(true);
    expect(canShareQuickNotes('personal')).toBe(false);
    expect(canShareQuickNotes('storefront_buyer')).toBe(false);
  });
});

describe('mergeQuickNotes', () => {
  it('dedupes a server note against the same note still pending locally', () => {
    const merged = mergeQuickNotes(
      [serverNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })],
      [pendingNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id: -100 })],
    );
    expect(merged).toHaveLength(1);
  });

  it('keeps both when client_uuids differ', () => {
    const merged = mergeQuickNotes(
      [serverNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })],
      [pendingNote({ client_uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })],
    );
    expect(merged).toHaveLength(2);
  });

  it('prefers the server copy over the pending copy when they collide', () => {
    const merged = mergeQuickNotes(
      [serverNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Server title' })],
      [pendingNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Stale local title', id: -100 })],
    );
    const only = merged[0];
    expect(only.title).toBe('Server title');
    expect(only._pendingSync).toBeUndefined();
  });

  it('sorts newest updated_at first', () => {
    const merged = mergeQuickNotes(
      [
        serverNote({ client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', updated_at: '2026-01-01T08:00:00Z' }),
        serverNote({ client_uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', updated_at: '2026-01-02T08:00:00Z' }),
      ],
      [],
    );
    expect(merged.map((n) => n.client_uuid)).toEqual([
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ]);
  });

  it('returns local pending notes when server list is empty (offline)', () => {
    const merged = mergeQuickNotes([], [pendingNote()]);
    expect(merged).toHaveLength(1);
    expect(merged[0]._pendingSync).toBe(true);
  });

  it('sorts pinned notes before unpinned regardless of updated_at', () => {
    const merged = mergeQuickNotes(
      [
        serverNote({
          client_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          is_pinned: false,
          updated_at: '2026-01-02T08:00:00Z',
        }),
        serverNote({
          client_uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          is_pinned: true,
          updated_at: '2026-01-01T08:00:00Z',
        }),
      ],
      [],
    );
    expect(merged[0].client_uuid).toBe('cccccccc-cccc-cccc-cccc-cccccccccccc');
  });
});
