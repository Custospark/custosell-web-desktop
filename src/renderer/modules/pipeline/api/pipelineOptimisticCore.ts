import type { QueryClient } from '@tanstack/react-query';
import { store } from '../../../app/store/store';
import type {
  PipelineBoard,
  PipelineLead,
  PipelineLeadActivity,
  PipelineUserRef,
} from './pipelineTypes';
import { pipelineKeys } from './pipelineQueryKeys';
import { replaceLeadOnKanban } from './pipelineKanbanCache';

let optimisticIdCounter = 0;

export function nextOptimisticId(): number {
  optimisticIdCounter += 1;
  return -(Date.now() + optimisticIdCounter);
}

export function getOptimisticActor(): PipelineUserRef {
  const user = store.getState().auth.user;
  return {
    id: user?.id ?? 0,
    name: user?.name ?? 'You',
    avatar: user?.avatar ?? null,
  };
}

export function normalizeValue(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

export function findKanbanLead(board: PipelineBoard | undefined, leadId: number): PipelineLead | undefined {
  if (!board?.stages?.length) return undefined;
  for (const stage of board.stages) {
    const match = (stage.leads ?? []).find((lead) => lead.id === leadId);
    if (match) return match;
  }
  return undefined;
}

export function toKanbanLeadSnapshot(lead: PipelineLead, existing?: PipelineLead): PipelineLead {
  const merged = { ...(existing ?? {}), ...lead };
  return {
    ...merged,
    activities: undefined,
    checklists: existing?.checklists ?? lead.checklists,
    attachments: existing?.attachments ?? lead.attachments,
    history_count: lead.history_count ?? existing?.history_count ?? merged.history_count,
    comments_count: lead.comments_count ?? existing?.comments_count ?? merged.comments_count,
  };
}

export function applyLeadMutationToCache(
  qc: QueryClient,
  lead: PipelineLead,
  boardId?: number,
): void {
  qc.setQueryData<PipelineLead>(pipelineKeys.lead(lead.id), (existing) => ({
    ...(existing ?? {}),
    ...lead,
    activities: lead.activities ?? existing?.activities,
    history_count: lead.history_count ?? existing?.history_count,
    comments_count: lead.comments_count ?? existing?.comments_count,
  }));

  const resolvedBoardId = boardId ?? lead.board_id;
  if (!resolvedBoardId) return;

  qc.setQueryData(pipelineKeys.kanban(resolvedBoardId), (old) => {
    if (!old) return old;
    const board = old as PipelineBoard;
    const existing = findKanbanLead(board, lead.id);
    return replaceLeadOnKanban(board, toKanbanLeadSnapshot(lead, existing));
  });
}

export function makeActivity(
  leadId: number,
  type: PipelineLeadActivity['type'],
  body: string,
  metadata?: Record<string, unknown> | null,
  actor?: PipelineUserRef,
  parentId?: number | null,
): PipelineLeadActivity {
  const user = actor ?? getOptimisticActor();
  return {
    id: nextOptimisticId(),
    lead_id: leadId,
    parent_id: parentId ?? null,
    user_id: user.id,
    type,
    body,
    metadata: metadata ?? null,
    user,
    can_edit: true,
    can_delete: true,
    created_at: new Date().toISOString(),
  };
}
