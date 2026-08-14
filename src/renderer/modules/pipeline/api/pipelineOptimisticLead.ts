import type { QueryClient } from '@tanstack/react-query';
import type {
  PipelineActivityReactions,
  PipelineBoard,
  PipelineLead,
  PipelineLeadActivity,
} from './pipelineTypes';
import { pipelineKeys } from './pipelineQueryKeys';
import { findKanbanLead } from './pipelineOptimisticCore';
import { buildOptimisticSystemEntry } from './pipelineOptimisticHistory';
import { updateLeadOnKanban } from './pipelineKanbanCache';

const USER_COMMENT_TYPES = new Set<PipelineLeadActivity['type']>([
  'note',
  'comment',
  'call',
  'email',
  'meeting',
]);

export function appendLeadActivitiesOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number | undefined,
  entries: PipelineLeadActivity[],
  options?: { bumpHistory?: boolean; bumpComments?: boolean },
): void {
  if (entries.length === 0) return;

  const commentEntries = entries.filter((e) => USER_COMMENT_TYPES.has(e.type));
  const bumpHistory = options?.bumpHistory !== false;
  const bumpComments = options?.bumpComments !== false;

  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
    if (!existing) return existing;
    const activities = [...(existing.activities ?? []), ...entries];
    return {
      ...existing,
      activities,
      history_count:
        (existing.history_count ?? 0) + (bumpHistory ? entries.length : 0),
      comments_count:
        (existing.comments_count ?? 0) + (bumpComments ? commentEntries.length : 0),
    };
  });

  const resolvedBoardId = boardId ?? qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId))?.board_id;
  if (!resolvedBoardId) return;

  qc.setQueryData(pipelineKeys.kanban(resolvedBoardId), (old) => {
    if (!old) return old;
    const board = old as PipelineBoard;
    const existing = findKanbanLead(board, leadId);
    if (!existing) return board;
    const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
    return updateLeadOnKanban(board, leadId, {
      history_count: lead?.history_count ?? existing.history_count,
      comments_count: lead?.comments_count ?? existing.comments_count,
    });
  });
}

export function replaceOptimisticActivity(
  qc: QueryClient,
  leadId: number,
  tempId: number,
  activity: PipelineLeadActivity,
): void {
  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
    if (!existing?.activities) return existing;
    return {
      ...existing,
      activities: existing.activities.map((item) => (item.id === tempId ? activity : item)),
    };
  });
}

export function removeLeadActivityOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number | undefined,
  activityId: number,
): PipelineLeadActivity | undefined {
  let removed: PipelineLeadActivity | undefined;

  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
    if (!existing?.activities) return existing;
    removed = existing.activities.find((a) => a.id === activityId);
    if (!removed) return existing;
    const isComment = USER_COMMENT_TYPES.has(removed.type);
    return {
      ...existing,
      activities: existing.activities.filter(
        (a) => a.id !== activityId && a.parent_id !== activityId,
      ),
      history_count: Math.max(0, (existing.history_count ?? 0) - 1),
      comments_count: Math.max(0, (existing.comments_count ?? 0) - (isComment ? 1 : 0)),
    };
  });

  const resolvedBoardId = boardId ?? qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId))?.board_id;
  if (resolvedBoardId) {
    qc.setQueryData(pipelineKeys.kanban(resolvedBoardId), (old) => {
      if (!old) return old;
      const existing = findKanbanLead(old as PipelineBoard, leadId);
      if (!existing) return old;
      const lead = qc.getQueryData<PipelineLead>(pipelineKeys.lead(leadId));
      return updateLeadOnKanban(old as PipelineBoard, leadId, {
        history_count: lead?.history_count ?? existing.history_count,
        comments_count: lead?.comments_count ?? existing.comments_count,
      });
    });
  }

  return removed;
}

export function removeCommentWithHistoryOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number | undefined,
  activityId: number,
): void {
  const removed = removeLeadActivityOptimistic(qc, leadId, boardId, activityId);
  if (!removed || !USER_COMMENT_TYPES.has(removed.type)) return;

  appendLeadActivitiesOptimistic(qc, leadId, boardId, [
    buildOptimisticSystemEntry(leadId, 'Comment removed', {
      action: 'comment_removed',
      comment_type: removed.type,
      preview: removed.body?.slice(0, 120) ?? null,
    }),
  ], { bumpComments: false });
}

export function patchLeadActivityOptimistic(
  qc: QueryClient,
  leadId: number,
  activityId: number,
  patch: Partial<PipelineLeadActivity>,
): void {
  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
    if (!existing?.activities) return existing;
    return {
      ...existing,
      activities: existing.activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity,
      ),
    };
  });
}

export function patchLeadFieldsOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number,
  patch: Partial<PipelineLead>,
  historyEntry?: PipelineLeadActivity,
): void {
  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) =>
    existing ? { ...existing, ...patch } : existing,
  );
  if (historyEntry) {
    appendLeadActivitiesOptimistic(qc, leadId, boardId, [historyEntry]);
  }
  qc.setQueryData(pipelineKeys.kanban(boardId), (old) =>
    old ? updateLeadOnKanban(old as PipelineBoard, leadId, patch) : old,
  );
}

export function patchActivityReactionOptimistic(
  qc: QueryClient,
  leadId: number,
  activityId: number,
  reactions: PipelineActivityReactions,
): void {
  qc.setQueryData<PipelineLead>(pipelineKeys.lead(leadId), (existing) => {
    if (!existing?.activities) return existing;
    return {
      ...existing,
      activities: existing.activities.map((activity) =>
        activity.id === activityId ? { ...activity, reactions } : activity,
      ),
    };
  });
}
