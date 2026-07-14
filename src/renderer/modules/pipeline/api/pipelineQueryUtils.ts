import type { useQueryClient } from '@tanstack/react-query';
import { pipelineKeys, pipelineProgressKeys } from './pipelineQueryKeys';

export function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

export function normalizeItem<T>(payload: unknown): T {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object') return obj.data as T;
    return payload as T;
  }
  throw new Error('Invalid API response');
}

export function omitSilent<T extends { silent?: boolean }>(vars: T): Omit<T, 'silent'> {
  const { silent: _omit, ...rest } = vars;
  void _omit;
  return rest;
}

export function omitLeadMeta<T extends { silent?: boolean; board_id?: number }>(
  vars: T,
): Omit<T, 'silent' | 'board_id'> {
  const { silent: _s, board_id: _b, ...rest } = vars;
  void _s;
  void _b;
  return rest;
}

export const listQueryDefaults = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

export const kanbanQueryDefaults = {
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

export const leadDetailQueryDefaults = {
  staleTime: 15_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
};

export function invalidatePipelineBoardsList(qc: ReturnType<typeof useQueryClient>): void {
  qc.invalidateQueries({ queryKey: pipelineKeys.boards() });
}

export function invalidatePipelineBoardScope(
  qc: ReturnType<typeof useQueryClient>,
  boardId?: number,
): void {
  if (boardId) {
    qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
    qc.invalidateQueries({ queryKey: pipelineKeys.board(boardId) });
    qc.invalidateQueries({ queryKey: [...pipelineKeys.all, 'calendar'] });
    qc.invalidateQueries({ queryKey: pipelineProgressKeys.summaryBoard(boardId) });
    qc.invalidateQueries({ queryKey: pipelineProgressKeys.targets(boardId) });
  }
  qc.invalidateQueries({ queryKey: pipelineKeys.insights() });
}
