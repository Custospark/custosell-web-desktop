import { describe, expect, it } from 'vitest';
import {
  canContributeToBoard,
  canManageBoardSettings,
  getSharedBoardMemberRole,
  type BoardAccessBoard,
} from '../boardAccess';
import type { AuthUser } from '../../../app/store/slices/authSlice';

/**
 * Regression tests for the external-owner privilege leak: a collaborator who
 * OWNS a different business must never be treated as a board manager purely
 * because isBusinessOwner() is true in their own account.
 */
describe('board access manager gating (FE, mirrored on BE)', () => {
  const ownerOfBusinessA = {
    id: 1,
    business_id: 1,
    is_business_owner: true,
  } as unknown as AuthUser;

  const ownerOfBusinessB = {
    id: 2,
    business_id: 2,
    is_business_owner: true,
  } as unknown as AuthUser;

  it('allows the same-business owner to manage shared boards', () => {
    const board = {
      business_id: 1,
      visibility: 'shared',
      created_by: 1,
    };
    expect(canManageBoardSettings(ownerOfBusinessA, board)).toBe(true);
  });

  it('never lets an external business owner manage another business board', () => {
    expect(canManageBoardSettings(ownerOfBusinessB, doContributorBoard())).toBe(false);
    expect(getSharedBoardMemberRole(ownerOfBusinessB, doContributorBoard())).toBe('contributor');
    expect(canContributeToBoard(ownerOfBusinessB, doContributorBoard())).toBe(true);
  });

  it('treats an external manager-as-invited-role as a manager on that board', () => {
    expect(canManageBoardSettings(ownerOfBusinessB, memberBoard('manager'))).toBe(true);
    expect(getSharedBoardMemberRole(ownerOfBusinessB, memberBoard('manager'))).toBe('manager');
  });

  it('respects the backend can_manage_settings contract when present', () => {
    const board = {
      business_id: 1,
      visibility: 'shared',
      can_manage_settings: false,
    };
    expect(canManageBoardSettings(ownerOfBusinessA, board)).toBe(false);
  });
});

function doContributorBoard(): BoardAccessBoard {
  return {
    business_id: 1,
    visibility: 'shared',
    created_by: 1,
    members: [{ user_id: 2, role: 'contributor' }],
  };
}

function memberBoard(role: string): BoardAccessBoard {
  return {
    business_id: 1,
    visibility: 'shared',
    created_by: 1,
    members: [{ user_id: 2, role }],
  };
}