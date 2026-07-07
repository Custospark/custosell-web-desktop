import type { PipelineBoard } from '../api/pipelineTypes';

/** Sales pipeline boards (Pipeline module only). */
export function boardBelongsToPipelineWorkspace(board: PipelineBoard): boolean {
  if (board.project_id) return false;
  return board.workspace === 'pipeline' || !board.workspace;
}

/** Project boards + personal estimates boards (Projects & Estimates module). */
export function boardBelongsToEstimatesWorkspace(board: PipelineBoard): boolean {
  if (board.project_id) return true;
  return board.workspace === 'estimates';
}

export function filterBoardsForWorkspace(
  boards: PipelineBoard[],
  workspace: 'pipeline' | 'estimates',
): PipelineBoard[] {
  return workspace === 'estimates'
    ? boards.filter(boardBelongsToEstimatesWorkspace)
    : boards.filter(boardBelongsToPipelineWorkspace);
}
