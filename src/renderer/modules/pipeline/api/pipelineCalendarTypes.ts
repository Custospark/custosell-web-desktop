import type { PipelineCardType, PipelineLeadStatus, PipelinePriority, PipelineUserRef } from './pipelineTypes';

export type PipelineCalendarDateField = 'due' | 'start' | 'close' | 'all';

export type PipelineCalendarDateKind = 'start' | 'due' | 'close';

export interface PipelineCalendarLead {
  id: number;
  title: string;
  card_type?: PipelineCardType;
  estimated_value: number | null;
  currency: string;
  status: PipelineLeadStatus;
  priority?: PipelinePriority | null;
  date_kind?: PipelineCalendarDateKind;
  time?: string | null;
  stage: { id: number; name: string; color: string | null } | null;
  assignee: PipelineUserRef | null;
  board?: { id: number; name: string } | null;
}

export interface PipelineCalendarDay {
  date: string;
  leads: PipelineCalendarLead[];
}
