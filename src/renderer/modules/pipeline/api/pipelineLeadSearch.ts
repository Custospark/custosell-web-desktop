import type { PipelineLead, PipelinePriority } from './pipelineTypes';

export interface ParsedLeadSearch {
  /** Free-text tokens (title, contact, assignee, etc.) */
  text: string;
  /** Label name fragments from @label tokens */
  labels: string[];
  /** Priority filter from !priority tokens */
  priority: PipelinePriority | null;
  /** Due-date filter from # tokens */
  dueFilter: 'overdue' | 'today' | 'week' | string | null;
  /** Assigned-to filter — 'me' means current user */
  assignedTo: 'me' | null;
}

const PRIORITY_ALIASES: Record<string, PipelinePriority> = {
  low: 'low',
  medium: 'medium',
  med: 'medium',
  high: 'high',
  urgent: 'urgent',
};

function parseIsoDateToken(raw: string): string | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : raw;
}

/** Parse board card search — @label, !priority, #due-date, @me */
export function parseLeadSearchQuery(raw: string): ParsedLeadSearch {
  const labels: string[] = [];
  let priority: PipelinePriority | null = null;
  let dueFilter: ParsedLeadSearch['dueFilter'] = null;
  let assignedTo: ParsedLeadSearch['assignedTo'] = null;
  const textParts: string[] = [];

  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith('@') && token.length > 1) {
      const key = token.slice(1).toLowerCase();
      if (key === 'me') {
        assignedTo = 'me';
      } else {
        labels.push(key);
      }
      continue;
    }
    if (token.startsWith('!') && token.length > 1) {
      const key = token.slice(1).toLowerCase();
      priority = PRIORITY_ALIASES[key] ?? priority;
      continue;
    }
    if (token.startsWith('#') && token.length > 1) {
      const key = token.slice(1).toLowerCase();
      if (key === 'overdue') dueFilter = 'overdue';
      else if (key === 'today') dueFilter = 'today';
      else if (key === 'week') dueFilter = 'week';
      else {
        const iso = parseIsoDateToken(key);
        if (iso) dueFilter = iso;
        else textParts.push(token);
      }
      continue;
    }
    textParts.push(token);
  }

  return {
    text: textParts.join(' ').trim(),
    labels,
    priority,
    dueFilter,
    assignedTo,
  };
}

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function leadDueDateString(lead: PipelineLead): string | null {
  const raw = lead.due_date ?? lead.expected_close_date;
  if (!raw) return null;
  return raw.slice(0, 10);
}

function matchesDueFilter(lead: PipelineLead, filter: ParsedLeadSearch['dueFilter']): boolean {
  if (!filter) return true;
  const dueStr = leadDueDateString(lead);
  const todayStr = todayUtcDateString();

  if (filter === 'overdue') {
    if (lead.status !== 'open') return false;
    return dueStr != null && dueStr < todayStr;
  }
  if (filter === 'today') {
    return dueStr === todayStr;
  }
  if (filter === 'week') {
    if (!dueStr) return false;
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 7);
    const endStr = end.toISOString().slice(0, 10);
    return dueStr >= todayStr && dueStr <= endStr;
  }
  if (typeof filter === 'string') {
    return dueStr === filter;
  }
  return true;
}

export function leadMatchesParsedSearch(
  lead: PipelineLead,
  parsed: ParsedLeadSearch,
  currentUserId?: number,
): boolean {
  if (parsed.priority && lead.priority !== parsed.priority) return false;
  if (!matchesDueFilter(lead, parsed.dueFilter)) return false;

  if (parsed.assignedTo === 'me') {
    if (!currentUserId) return false;
    const assignedUserIds = [
      lead.assigned_to,
      lead.assignee?.id ?? null,
      ...(lead.assignees ?? []).map((a) => a.id),
    ].filter((id): id is number => id != null)
     .map((id) => Number(id));
    if (!assignedUserIds.includes(Number(currentUserId))) return false;
  }

  if (parsed.labels.length > 0) {
    const leadLabels = (lead.labels ?? []).map((l) => l.name.toLowerCase());
    const ok = parsed.labels.every((q) =>
      leadLabels.some((name) => name.includes(q)),
    );
    if (!ok) return false;
  }

  const q = parsed.text.toLowerCase();
  if (!q) return true;

  return [
    lead.title,
    lead.contact_name,
    lead.contact_email,
    lead.contact_phone,
    lead.assignee?.name,
    lead.source?.name,
    ...(lead.labels ?? []).map((l) => l.name),
  ].some((v) => v?.toLowerCase().includes(q));
}

export function leadMatchesSearchQuery(
  lead: PipelineLead,
  raw: string,
  currentUserId?: number,
): boolean {
  const trimmed = raw.trim();
  if (!trimmed && !currentUserId) return true;
  const parsed = parseLeadSearchQuery(trimmed);
  if (!trimmed && parsed.assignedTo !== 'me') return true;
  return leadMatchesParsedSearch(lead, parsed, currentUserId);
}
