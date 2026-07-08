import type { QueryClient } from '@tanstack/react-query';
import { store } from '../../../app/store/store';
import type {
  PipelineActivityReactions,
  PipelineBoard,
  PipelineBoardAnnouncement,
  PipelineBoardCollaborationSummary,
  PipelineChecklist,
  PipelineChecklistItem,
  PipelineLead,
  PipelineLeadActivity,
  PipelinePoll,
  PipelineReminder,
  PipelineUserRef,
  UpdateLeadPayload,
} from './pipelineTypes';
import { pipelineCollaborationKeys, pipelineKeys } from './pipelineQueryKeys';
import { replaceLeadOnKanban, updateLeadOnKanban } from './pipelineKanbanCache';
const USER_COMMENT_TYPES = new Set<PipelineLeadActivity['type']>([
  'note',
  'comment',
  'call',
  'email',
  'meeting',
]);

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

function normalizeValue(value: unknown): string | null {
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

function makeActivity(
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
    created_at: new Date().toISOString(),
  };
}

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

const UPDATE_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  due_date: 'Due date',
  expected_close_date: 'Expected close',
  start_date: 'Start date',
  priority: 'Priority',
  estimated_value: 'Estimated value',
  background_color: 'Card color',
  lost_reason: 'Lost reason',
  contact_name: 'Contact name',
  contact_email: 'Contact email',
  contact_phone: 'Contact phone',
  source_id: 'Source',
};

export function buildOptimisticHistoryForUpdate(
  before: PipelineLead,
  payload: UpdateLeadPayload,
  actor?: PipelineUserRef,
): PipelineLeadActivity[] {
  const entries: PipelineLeadActivity[] = [];
  const user = actor ?? getOptimisticActor();

  for (const [field, label] of Object.entries(UPDATE_FIELD_LABELS)) {
    if (!(field in payload)) continue;
    const from = before[field as keyof PipelineLead];
    const to = payload[field as keyof UpdateLeadPayload];
    if (normalizeValue(from) === normalizeValue(to)) continue;
    entries.push(
      makeActivity(before.id, 'system', `${label} updated`, {
        action: 'field_change',
        field,
        field_label: label,
        from,
        to,
      }, user),
    );
  }

  if ('label_ids' in payload && payload.label_ids) {
    const beforeNames = (before.labels ?? []).map((l) => l.name).sort();
    const afterIds = payload.label_ids;
    const beforeIds = (before.labels ?? []).map((l) => l.id).sort();
    if (beforeIds.join(',') !== [...afterIds].sort((a, b) => a - b).join(',')) {
      entries.push(
        makeActivity(before.id, 'system', 'Labels updated', {
          action: 'labels_change',
          from: beforeNames,
          to: beforeNames,
        }, user),
      );
    }
  }

  if ('assignee_ids' in payload && payload.assignee_ids) {
    const beforeIds = (before.assignees ?? []).map((a) => a.id).sort((a, b) => a - b).join(',');
    const afterIds = [...payload.assignee_ids].sort((a, b) => a - b).join(',');
    if (beforeIds !== afterIds) {
      const beforeNames = (before.assignees ?? []).map((a) => a.name);
      entries.push(
        makeActivity(before.id, 'system', 'Assignees updated', {
          action: 'assignees_change',
          from: beforeNames.length ? beforeNames : ['Unassigned'],
          to: beforeNames.length ? beforeNames : ['Unassigned'],
        }, user),
      );
    }
  }

  return entries;
}

export function buildOptimisticStageChange(
  lead: PipelineLead,
  fromStageName: string,
  toStageName: string,
  actor?: PipelineUserRef,
): PipelineLeadActivity {
  return makeActivity(
    lead.id,
    'stage_change',
    `Moved from ${fromStageName} to ${toStageName}`,
    {
      from_stage_name: fromStageName,
      to_stage_name: toStageName,
      from_stage_id: lead.stage_id,
    },
    actor,
  );
}

export function buildOptimisticSystemEntry(
  leadId: number,
  body: string,
  metadata?: Record<string, unknown>,
  actor?: PipelineUserRef,
): PipelineLeadActivity {
  return makeActivity(leadId, 'system', body, metadata ?? null, actor);
}

export function buildOptimisticReactionEntry(
  leadId: number,
  reaction: 'like' | 'dislike' | null,
  preview?: string | null,
  targetActivityId?: number,
  actor?: PipelineUserRef,
): PipelineLeadActivity | null {
  if (reaction === 'like') {
    return buildOptimisticSystemEntry(leadId, 'Liked a comment', {
      action: 'reaction',
      reaction: 'like',
      target_activity_id: targetActivityId,
      preview,
    }, actor);
  }
  if (reaction === 'dislike') {
    return buildOptimisticSystemEntry(leadId, 'Disliked a comment', {
      action: 'reaction',
      reaction: 'dislike',
      target_activity_id: targetActivityId,
      preview,
    }, actor);
  }
  if (reaction === null) {
    return buildOptimisticSystemEntry(leadId, 'Removed reaction', {
      action: 'reaction_removed',
      target_activity_id: targetActivityId,
      preview,
    }, actor);
  }
  return null;
}

export function buildOptimisticComment(
  leadId: number,
  type: PipelineLeadActivity['type'],
  body: string,
  parentId?: number | null,
  actor?: PipelineUserRef,
): PipelineLeadActivity {
  return makeActivity(leadId, type, body, null, actor, parentId);
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

export function computeChecklistCounts(checklists: PipelineChecklist[] | undefined): {
  checklist_total: number;
  checklist_done: number;
} {
  const items = (checklists ?? []).flatMap((checklist) => checklist.items ?? []);
  return {
    checklist_total: items.length,
    checklist_done: items.filter((item) => item.is_done).length,
  };
}

export function applyLeadChecklistsOptimistic(
  qc: QueryClient,
  leadId: number,
  boardId: number,
  checklists: PipelineChecklist[],
  historyEntry?: PipelineLeadActivity,
): void {
  patchLeadFieldsOptimistic(
    qc,
    leadId,
    boardId,
    { checklists, ...computeChecklistCounts(checklists) },
    historyEntry,
  );
}

export function replaceChecklistInLead(
  checklists: PipelineChecklist[],
  checklistId: number,
  next: PipelineChecklist,
): PipelineChecklist[] {
  return checklists.map((checklist) => (checklist.id === checklistId ? next : checklist));
}

export function replaceChecklistItemInLead(
  checklists: PipelineChecklist[],
  itemId: number,
  next: PipelineChecklistItem,
): PipelineChecklist[] {
  return checklists.map((checklist) => ({
    ...checklist,
    items: (checklist.items ?? []).map((item) => (item.id === itemId ? next : item)),
  }));
}

export function mergeServerChecklist(
  checklists: PipelineChecklist[],
  tempId: number,
  serverChecklist: PipelineChecklist,
): PipelineChecklist[] {
  return checklists.map((checklist) =>
    checklist.id === tempId
      ? { ...serverChecklist, items: checklist.items ?? serverChecklist.items ?? [] }
      : checklist,
  );
}

export function mergeServerChecklistItem(
  checklists: PipelineChecklist[],
  tempId: number,
  serverItem: PipelineChecklistItem,
): PipelineChecklist[] {
  return checklists.map((checklist) => ({
    ...checklist,
    items: (checklist.items ?? []).map((item) =>
      item.id === tempId ? serverItem : item,
    ),
  }));
}

export function patchCollaborationSummary(
  qc: QueryClient,
  boardId: number,
  patch: Partial<PipelineBoardCollaborationSummary>,
): void {
  qc.setQueryData<PipelineBoardCollaborationSummary>(
    pipelineCollaborationKeys.summary(boardId),
    (existing) => {
      if (!existing) return existing;
      const next = { ...existing, ...patch };
      const unread = next.unread_announcements_count ?? 0;
      const pending = next.polls_pending_vote_count ?? 0;
      next.attention_count = unread + pending;
      next.has_attention = (next.attention_count ?? 0) > 0;
      return next;
    },
  );
}

export function prependAnnouncementOptimistic(
  qc: QueryClient,
  boardId: number,
  announcement: PipelineBoardAnnouncement,
): void {
  qc.setQueryData<PipelineBoardAnnouncement[]>(
    pipelineCollaborationKeys.announcements(boardId),
    (existing) => [announcement, ...(existing ?? [])],
  );
  patchCollaborationSummary(qc, boardId, {
    announcements_count: ((qc.getQueryData(pipelineCollaborationKeys.summary(boardId)) as PipelineBoardCollaborationSummary | undefined)?.announcements_count ?? 0) + 1,
  });
}

export function removeAnnouncementOptimistic(qc: QueryClient, boardId: number, id: number): void {
  qc.setQueryData<PipelineBoardAnnouncement[]>(
    pipelineCollaborationKeys.announcements(boardId),
    (existing) => (existing ?? []).filter((item) => item.id !== id),
  );
}

export function patchAnnouncementOptimistic(
  qc: QueryClient,
  boardId: number,
  id: number,
  patch: Partial<PipelineBoardAnnouncement>,
): void {
  qc.setQueryData<PipelineBoardAnnouncement[]>(
    pipelineCollaborationKeys.announcements(boardId),
    (existing) => (existing ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

export function prependPollOptimistic(qc: QueryClient, boardId: number, poll: PipelinePoll, leadId?: number): void {
  for (const key of [pipelineCollaborationKeys.polls(boardId), pipelineCollaborationKeys.polls(boardId, leadId)]) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) => [poll, ...(existing ?? [])]);
  }
  patchCollaborationSummary(qc, boardId, {
    active_polls_count: ((qc.getQueryData(pipelineCollaborationKeys.summary(boardId)) as PipelineBoardCollaborationSummary | undefined)?.active_polls_count ?? 0) + 1,
    polls_pending_vote_count: ((qc.getQueryData(pipelineCollaborationKeys.summary(boardId)) as PipelineBoardCollaborationSummary | undefined)?.polls_pending_vote_count ?? 0) + 1,
  });
}

export function removePollOptimistic(qc: QueryClient, boardId: number, pollId: number, leadId?: number): void {
  for (const key of [pipelineCollaborationKeys.polls(boardId), pipelineCollaborationKeys.polls(boardId, leadId)]) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) => (existing ?? []).filter((p) => p.id !== pollId));
  }
}

export function applyPollToCache(qc: QueryClient, boardId: number, poll: PipelinePoll, leadId?: number): void {
  for (const key of [pipelineCollaborationKeys.polls(boardId), pipelineCollaborationKeys.polls(boardId, leadId)]) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) =>
      (existing ?? []).map((item) => (item.id === poll.id ? { ...item, ...poll } : item)),
    );
  }
}

export function prependReminderOptimistic(qc: QueryClient, leadId: number, reminder: PipelineReminder): void {
  qc.setQueryData<PipelineReminder[]>(
    pipelineCollaborationKeys.reminders(leadId),
    (existing) => [reminder, ...(existing ?? [])],
  );
}

export function removeReminderOptimistic(qc: QueryClient, leadId: number, reminderId: number): void {
  qc.setQueryData<PipelineReminder[]>(
    pipelineCollaborationKeys.reminders(leadId),
    (existing) => (existing ?? []).filter((r) => r.id !== reminderId),
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
