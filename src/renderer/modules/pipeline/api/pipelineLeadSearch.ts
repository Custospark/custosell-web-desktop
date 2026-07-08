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

/** Parse board card search — @label, !priority, #due-date */
export function parseLeadSearchQuery(raw: string): ParsedLeadSearch {
  const labels: string[] = [];
  let priority: PipelinePriority | null = null;
  let dueFilter: ParsedLeadSearch['dueFilter'] = null;
  const textParts: string[] = [];

  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith('@') && token.length > 1) {
      labels.push(token.slice(1).toLowerCase());
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
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function leadDueDate(lead: PipelineLead): Date | null {
  const raw = lead.due_date ?? lead.expected_close_date;
  if (!raw) return null;
  const d = new Date(raw.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchesDueFilter(lead: PipelineLead, filter: ParsedLeadSearch['dueFilter']): boolean {
  if (!filter) return true;
  const due = leadDueDate(lead);
  const today = startOfDay(new Date());

  if (filter === 'overdue') {
    if (lead.status !== 'open') return false;
    return due != null && due < today;
  }
  if (filter === 'today') {
    if (!due) return false;
    return due.getTime() === today.getTime();
  }
  if (filter === 'week') {
    if (!due) return false;
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return due >= today && due <= end;
  }
  if (typeof filter === 'string') {
    if (!due) return false;
    return due.toISOString().slice(0, 10) === filter;
  }
  return true;
}

export function leadMatchesParsedSearch(lead: PipelineLead, parsed: ParsedLeadSearch): boolean {
  if (parsed.priority && lead.priority !== parsed.priority) return false;
  if (!matchesDueFilter(lead, parsed.dueFilter)) return false;

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

export function leadMatchesSearchQuery(lead: PipelineLead, raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return leadMatchesParsedSearch(lead, parseLeadSearchQuery(trimmed));
}
