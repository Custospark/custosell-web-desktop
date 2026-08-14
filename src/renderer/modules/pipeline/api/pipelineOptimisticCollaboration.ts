import type { QueryClient } from '@tanstack/react-query';
import type {
  PipelineBoardAnnouncement,
  PipelineBoardCollaborationSummary,
  PipelinePoll,
  PipelineReminder,
} from './pipelineTypes';
import { pipelineCollaborationKeys } from './pipelineQueryKeys';

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

function pollKeys(boardId: number, leadId?: number) {
  return leadId === undefined
    ? [pipelineCollaborationKeys.polls(boardId)]
    : [pipelineCollaborationKeys.polls(boardId), pipelineCollaborationKeys.polls(boardId, leadId)];
}

export function prependPollOptimistic(qc: QueryClient, boardId: number, poll: PipelinePoll, leadId?: number): void {
  for (const key of pollKeys(boardId, leadId)) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) => [poll, ...(existing ?? [])]);
  }
  patchCollaborationSummary(qc, boardId, {
    active_polls_count: ((qc.getQueryData(pipelineCollaborationKeys.summary(boardId)) as PipelineBoardCollaborationSummary | undefined)?.active_polls_count ?? 0) + 1,
    polls_pending_vote_count: ((qc.getQueryData(pipelineCollaborationKeys.summary(boardId)) as PipelineBoardCollaborationSummary | undefined)?.polls_pending_vote_count ?? 0) + 1,
  });
}

export function removePollOptimistic(qc: QueryClient, boardId: number, pollId: number, leadId?: number): void {
  for (const key of pollKeys(boardId, leadId)) {
    qc.setQueryData<PipelinePoll[]>(key, (existing) => (existing ?? []).filter((p) => p.id !== pollId));
  }
}

export function applyPollToCache(qc: QueryClient, boardId: number, poll: PipelinePoll, leadId?: number): void {
  for (const key of pollKeys(boardId, leadId)) {
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
