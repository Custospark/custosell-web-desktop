import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { activityTypeLabel, USER_COMMENT_TYPES } from './pipelineActivityMeta';

/** Full card timeline — every activity on the lead (comments, moves, attachments, reactions, etc.). */
export function buildHistoryTimeline(activities: PipelineLeadActivity[] = []): PipelineLeadActivity[] {
  return [...activities].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

function formatFieldValue(field: string | undefined, value: unknown, currency = 'UGX'): string {
  if (value == null || value === '') return '—';
  if (field === 'due_date' || field === 'expected_close_date' || field === 'start_date') {
    return formatShiftDate(String(value));
  }
  if (field === 'estimated_value' && typeof value === 'number') {
    return formatCurrency(value, currency);
  }
  if (field === 'background_color' && typeof value === 'string') {
    return value;
  }
  return String(value);
}

export interface HistoryDisplay {
  headline: string;
  detail?: string;
  fromLabel?: string;
  toLabel?: string;
  isReply?: boolean;
}

export function formatHistoryActivity(
  activity: PipelineLeadActivity,
  currency = 'UGX',
): HistoryDisplay {
  const meta = activity.metadata ?? {};
  const action = typeof meta.action === 'string' ? meta.action : undefined;
  const preview = typeof meta.preview === 'string' ? meta.preview : undefined;

  if (USER_COMMENT_TYPES.has(activity.type)) {
    const label = activityTypeLabel(activity.type);
    return {
      headline: activity.parent_id ? `Reply · ${label}` : label,
      detail: activity.body ?? undefined,
      isReply: Boolean(activity.parent_id),
    };
  }

  if (activity.type === 'stage_change') {
    const from = typeof meta.from_stage_name === 'string' ? meta.from_stage_name : 'Previous stage';
    const to = typeof meta.to_stage_name === 'string' ? meta.to_stage_name : 'New stage';
    return {
      headline: 'Stage changed',
      detail: activity.body ?? undefined,
      fromLabel: from,
      toLabel: to,
    };
  }

  if (action === 'reaction') {
    const reaction = meta.reaction === 'dislike' ? 'dislike' : 'like';
    return {
      headline: reaction === 'like' ? 'Liked a comment' : 'Disliked a comment',
      detail: preview ?? activity.body ?? undefined,
    };
  }

  if (action === 'reaction_removed') {
    return {
      headline: 'Removed reaction',
      detail: preview ?? activity.body ?? undefined,
    };
  }

  if (action === 'comment_removed') {
    return {
      headline: 'Comment removed',
      detail: preview ?? activity.body ?? undefined,
    };
  }

  if (action === 'comment_edited') {
    return {
      headline: 'Comment edited',
      detail: preview ?? activity.body ?? undefined,
    };
  }

  if (action === 'attachment_added' || action === 'attachment_removed') {
    const fileName = typeof meta.file_name === 'string' ? meta.file_name : preview;
    return {
      headline: action === 'attachment_added' ? 'Attachment added' : 'Attachment removed',
      detail: fileName ?? activity.body ?? undefined,
    };
  }

  if (action === 'checklist_added' || action === 'checklist_removed') {
    const title = typeof meta.title === 'string' ? meta.title : activity.body;
    return {
      headline: action === 'checklist_added' ? 'Checklist added' : 'Checklist removed',
      detail: title ?? undefined,
    };
  }

  if (action === 'checklist_item_added' || action === 'checklist_item_removed') {
    const title = typeof meta.title === 'string' ? meta.title : activity.body;
    return {
      headline: action === 'checklist_item_added' ? 'Checklist item added' : 'Checklist item removed',
      detail: title ?? undefined,
    };
  }

  if (action === 'checklist_item_done' || action === 'checklist_item_reopened') {
    const title = typeof meta.title === 'string' ? meta.title : activity.body;
    return {
      headline: action === 'checklist_item_done' ? 'Checklist item completed' : 'Checklist item reopened',
      detail: title ?? undefined,
    };
  }

  if (action === 'status_change') {
    const from = typeof meta.from === 'string' ? meta.from : 'open';
    const to = typeof meta.to === 'string' ? meta.to : 'open';
    const isTask = meta.card_type === 'card';
    const fromLabel = from === 'won'
      ? (isTask ? 'Complete' : 'Won')
      : from === 'lost'
        ? 'Lost'
        : from === 'open'
          ? (isTask ? 'In progress' : 'Open')
          : from;
    const toLabel = to === 'won'
      ? (isTask ? 'Complete' : 'Won')
      : to === 'lost'
        ? 'Lost'
        : to === 'open'
          ? (isTask ? 'In progress' : 'Open')
          : to;
    return {
      headline: activity.body ?? (isTask ? 'Task status updated' : 'Lead status updated'),
      fromLabel,
      toLabel,
    };
  }

  if (action === 'archived') {
    return {
      headline: 'Card archived',
      detail: activity.body ?? undefined,
    };
  }

  if (action === 'field_change') {
    const field = typeof meta.field === 'string' ? meta.field : undefined;
    const label = typeof meta.field_label === 'string' ? meta.field_label : 'Field updated';
    const from = formatFieldValue(field, meta.from, currency);
    const to = formatFieldValue(field, meta.to, currency);
    return {
      headline: label,
      fromLabel: from,
      toLabel: to,
    };
  }

  if (action === 'labels_change') {
    const from = Array.isArray(meta.from) ? meta.from.join(', ') : 'None';
    const to = Array.isArray(meta.to) ? meta.to.join(', ') : 'None';
    return {
      headline: 'Labels updated',
      fromLabel: from || 'None',
      toLabel: to || 'None',
    };
  }

  if (action === 'assignees_change') {
    const from = Array.isArray(meta.from) ? meta.from.join(', ') : 'Unassigned';
    const to = Array.isArray(meta.to) ? meta.to.join(', ') : 'Unassigned';
    return {
      headline: 'Assignees updated',
      fromLabel: from || 'Unassigned',
      toLabel: to || 'Unassigned',
    };
  }

  return {
    headline: activity.body ?? 'Activity',
    detail: activity.body ?? undefined,
  };
}
