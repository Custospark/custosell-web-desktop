import type {
  PipelineLead,
  PipelineLeadActivity,
  PipelineUserRef,
  UpdateLeadPayload,
} from './pipelineTypes';
import { getOptimisticActor, makeActivity, normalizeValue } from './pipelineOptimisticCore';

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

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
  archived: 'Archived',
};

function statusHistoryMessage(
  fromStatus: string,
  toStatus: string,
  cardType: string | null | undefined,
): string {
  const isTask = (cardType ?? 'lead') === 'card';
  if (toStatus === 'won') {
    return isTask ? 'Task marked complete' : 'Lead marked won';
  }
  if (toStatus === 'lost') {
    return isTask ? 'Task marked lost' : 'Lead marked lost';
  }
  if (fromStatus === 'won' && toStatus === 'open') {
    return isTask ? 'Task marked incomplete' : 'Lead reopened';
  }
  if (fromStatus === 'lost' && toStatus === 'open') {
    return isTask ? 'Task reopened' : 'Lead reopened';
  }
  const toLabel = STATUS_LABELS[toStatus] ?? toStatus;
  return isTask ? `Task status changed to ${toLabel}` : `Lead status changed to ${toLabel}`;
}

export function buildOptimisticStatusChange(
  lead: PipelineLead,
  fromStatus: string,
  toStatus: string,
  actor?: PipelineUserRef,
): PipelineLeadActivity | null {
  if (fromStatus === toStatus) return null;
  const user = actor ?? getOptimisticActor();
  return makeActivity(
    lead.id,
    'system',
    statusHistoryMessage(fromStatus, toStatus, lead.card_type),
    {
      action: 'status_change',
      from: fromStatus,
      to: toStatus,
      card_type: lead.card_type ?? 'lead',
    },
    user,
  );
}

export function buildOptimisticHistoryForUpdate(
  before: PipelineLead,
  payload: UpdateLeadPayload,
  actor?: PipelineUserRef,
): PipelineLeadActivity[] {
  const entries: PipelineLeadActivity[] = [];
  const user = actor ?? getOptimisticActor();

  if ('status' in payload && payload.status && payload.status !== before.status) {
    const statusEntry = buildOptimisticStatusChange(
      before,
      before.status ?? 'open',
      payload.status,
      user,
    );
    if (statusEntry) entries.push(statusEntry);
  }

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
