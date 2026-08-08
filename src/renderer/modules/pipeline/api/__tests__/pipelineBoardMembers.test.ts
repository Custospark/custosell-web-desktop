import { describe, expect, it } from 'vitest';
import { membersFromBoard } from '../pipelineBoardMembers';
import { normalizeBoardMemberRole } from '../boardRoleUtils';
import type { PipelineBoardMember } from '../pipelineTypes';

/**
 * Verifies the FE maps BE member payloads exactly as the backend serializes
 * them (PipelineBoardMemberResource): roles normalized, user name captured.
 */
describe('board member mapping contract', () => {
  it('maps backend members to BoardMemberInput with normalized role', () => {
    const backend = [
      {
        id: 1,
        board_id: 42,
        user_id: 2,
        role: 'contributor' as const,
        user: { id: 2, name: 'Ada Lovelace', email: 'ada@example.test', avatar: null },
      },
      {
        id: 2,
        board_id: 42,
        user_id: 3,
        role: 'editor' as const,
        user: { id: 3, name: 'Grace Hopper', email: 'grace@example.test', avatar: null },
      },
    ] satisfies PipelineBoardMember[];

    const mapped = membersFromBoard(backend);

    expect(mapped).toEqual([
      { user_id: 2, role: 'contributor', name: 'Ada Lovelace' },
      { user_id: 3, role: 'contributor', name: 'Grace Hopper' },
    ]);
  });

  it('returns empty input for undefined roster', () => {
    expect(membersFromBoard(undefined)).toEqual([]);
  });

  it('normalizes editor to contributor and unknown roles to viewer', () => {
    expect(normalizeBoardMemberRole('viewer')).toBe('viewer');
    expect(normalizeBoardMemberRole('contributor')).toBe('contributor');
    expect(normalizeBoardMemberRole('manager')).toBe('manager');
    expect(normalizeBoardMemberRole('editor')).toBe('contributor');
    expect(normalizeBoardMemberRole('admin' as never)).toBe('viewer');
  });
});