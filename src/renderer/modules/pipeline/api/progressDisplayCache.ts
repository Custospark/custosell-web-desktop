import type { BoardProgressSummary, MyProgressSummary } from './boardProgressTypes';

const teamSummaryByBoard = new Map<number, BoardProgressSummary>();
const mySummaryByBoard = new Map<number, MyProgressSummary>();

export function readCachedTeamProgress(boardId: number): BoardProgressSummary | undefined {
  return teamSummaryByBoard.get(boardId);
}

export function writeCachedTeamProgress(boardId: number, summary: BoardProgressSummary): void {
  teamSummaryByBoard.set(boardId, summary);
}

export function clearCachedTeamProgress(boardId: number): void {
  teamSummaryByBoard.delete(boardId);
}

export function readCachedMyProgress(boardId: number): MyProgressSummary | undefined {
  return mySummaryByBoard.get(boardId);
}

export function writeCachedMyProgress(boardId: number, summary: MyProgressSummary): void {
  mySummaryByBoard.set(boardId, summary);
}

export function clearCachedMyProgress(boardId: number): void {
  mySummaryByBoard.delete(boardId);
}
