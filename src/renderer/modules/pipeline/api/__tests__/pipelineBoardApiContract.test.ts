import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * FE→BE contract for pipeline board membership endpoints.
 * Mirrors routes/api/v1/pipeline.php (middleware: auth:sanctum,
 * business.active, subscription.active, pipeline.access).
 */

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../../../app/api/axiosConfig', () => ({
  axiosInstance: mocks,
}));

import {
  createPipelineBoard,
  fetchBoardTeamMembers,
  fetchPipelineBoard,
  fetchPipelineBoardKanban,
  fetchPipelineBoards,
  updatePipelineBoard,
} from '../pipelineBoardApiClient';

describe('pipeline board membership API contract', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.patch.mockReset();
  });

  it('GETs team-members with workspace + scope query params', async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });

    await fetchBoardTeamMembers('pipeline', 'business');

    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledWith('/pipeline/team-members?workspace=pipeline&scope=business');
  });

  it('defaults team-members to pipeline + workspace scope', async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    await fetchBoardTeamMembers();

    expect(mocks.get).toHaveBeenCalledWith('/pipeline/team-members?workspace=pipeline&scope=workspace');
  });

  it('GETs a single board (member roster lives here)', async () => {
    mocks.get.mockResolvedValue({ data: mockBoardResponse() });
    await fetchPipelineBoard(42);

    expect(mocks.get).toHaveBeenCalledWith('/pipeline/boards/42');
  });

  it('GETs the kanban view for a board', async () => {
    mocks.get.mockResolvedValue({ data: mockBoardResponse() });
    await fetchPipelineBoardKanban(42);

    expect(mocks.get).toHaveBeenCalledWith('/pipeline/boards/42/kanban');
  });

  it('GETs boards list with sales scope query', async () => {
    mocks.get.mockResolvedValue({ data: { data: [] } });
    await fetchPipelineBoards({ salesOnly: false });

    expect(mocks.get).toHaveBeenCalledWith('/pipeline/boards?sales_only=0');
  });

  it('POSTs a new shared board with the members payload', async () => {
    mocks.post.mockResolvedValue({ data: mockBoardResponse() });
    const payload = {
      name: 'Partner board',
      visibility: 'shared',
members: [
        { user_id: 2, role: 'manager', send_notification: true },
        { user_id: 11, role: 'viewer' },
      ],
    };

    await createPipelineBoard(payload);

    expect(mocks.post).toHaveBeenCalledWith('/pipeline/boards', payload);
  });

  it('PATCHes a board to add / change / remove members', async () => {
    mocks.patch.mockResolvedValue({ data: mockBoardResponse() });
    const payload = {
      members: [
        { user_id: 11, role: 'viewer' },
        { user_id: 2, role: 'contributor' },
      ],
    };

    await updatePipelineBoard(7, payload);

    expect(mocks.patch).toHaveBeenCalledWith('/pipeline/boards/7', payload);
  });

  it('PATCHes a board to remove all members with an empty array', async () => {
    mocks.patch.mockResolvedValue({ data: mockBoardResponse() });
    await updatePipelineBoard(7, { members: [] });

    expect(mocks.patch).toHaveBeenCalledWith('/pipeline/boards/7', { members: [] });
  });
});

/** Shape consistent with PipelineBoardResource from custosell-core-api. */
function mockBoardResponse() {
  return {
    data: {
      id: 42,
      business_id: 1,
      name: 'Partner board',
      visibility: 'shared',
      created_by: 1,
      members: [
        {
          id: 90,
          user_id: 2,
          role: 'viewer',
          user: { id: 2, name: 'Ada Lovelace', email: 'ada@example.test', avatar: null },
        },
      ],
      current_member_role: 'manager',
      can_contribute: true,
      can_manage_settings: true,
    },
  };
}