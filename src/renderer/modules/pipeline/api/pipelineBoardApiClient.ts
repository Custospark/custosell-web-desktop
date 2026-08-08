import { axiosInstance } from '../../../app/api/axiosConfig';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';

/**
 * Raw HTTP calls for pipeline board membership-related endpoints. Kept as free
 * functions (outside react-query hooks) so the FE→BE contract is unit-testable
 * against a mocked transport. See __tests__/pipelineBoardApiContract.test.ts.
 */

export interface PipelineBoardListOptions {
  salesOnly?: boolean;
  projectOnly?: boolean;
  estimatesWorkspace?: boolean;
}

export function fetchPipelineBoards(options: PipelineBoardListOptions = {}) {
  const projectOnly = options.projectOnly ?? false;
  const estimatesWorkspace = options.estimatesWorkspace ?? false;
  const salesOnly = projectOnly || estimatesWorkspace
    ? false
    : (options.salesOnly ?? true);
  const params = estimatesWorkspace
    ? '?estimates_workspace=1'
    : projectOnly
      ? '?project_only=1'
      : salesOnly
        ? '?sales_only=1'
        : '?sales_only=0';
  return axiosInstance.get(`${PIPELINE.BOARDS}${params}`);
}

export type BoardTeamMemberScope = 'workspace' | 'business';

export function fetchBoardTeamMembers(workspace = 'pipeline', scope: BoardTeamMemberScope = 'workspace') {
  return axiosInstance.get(`${PIPELINE.TEAM_MEMBERS}?workspace=${workspace}&scope=${scope}`);
}

export function fetchPipelineBoard(id: number) {
  return axiosInstance.get(PIPELINE.BOARD(id));
}

export function fetchPipelineBoardKanban(boardId: number) {
  return axiosInstance.get(PIPELINE.BOARD_KANBAN(boardId));
}

export function createPipelineBoard(payload: Record<string, unknown>) {
  return axiosInstance.post(PIPELINE.BOARDS, payload);
}

export function updatePipelineBoard(id: number, payload: Record<string, unknown>) {
  return axiosInstance.patch(PIPELINE.BOARD(id), payload);
}