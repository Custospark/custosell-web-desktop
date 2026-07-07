import type { PipelineLeadActivity } from '../api/pipelineTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { USER_COMMENT_TYPES } from './pipelineActivityMeta';

export function buildHistoryTimeline(activities: PipelineLeadActivity[] = []): PipelineLeadActivity[] {
  return activities
    .filter((activity) => !USER_COMMENT_TYPES.has(activity.type) && !activity.parent_id)
    .sort((a, b) => {
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
}

export function formatHistoryActivity(
  activity: PipelineLeadActivity,
  currency = 'UGX',
): HistoryDisplay {
  const meta = activity.metadata ?? {};
  const action = typeof meta.action === 'string' ? meta.action : undefined;

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
