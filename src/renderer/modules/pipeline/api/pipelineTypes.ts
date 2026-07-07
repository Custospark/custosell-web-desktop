export type PipelineVisibility = 'team' | 'private' | 'shared';

export type PipelineLeadStatus = 'open' | 'won' | 'lost' | 'converted' | 'archived';

export type PipelineCardType = 'lead' | 'card';

export type PipelinePriority = 'low' | 'medium' | 'high' | 'urgent';

export type PipelineActivityType = 'note' | 'comment' | 'call' | 'email' | 'meeting' | 'system' | 'stage_change';

export interface PipelineUserRef {
  id: number;
  name: string;
  avatar?: string | null;
}

export interface PipelineBoardMember {
  id: number;
  board_id: number;
  user_id: number;
  role: 'editor' | 'viewer';
  user?: PipelineUserRef;
}

export interface PipelineStage {
  id: number;
  board_id: number;
  name: string;
  sort_order: number;
  color: string | null;
  is_won: boolean;
  is_lost: boolean;
  rotting_days: number | null;
  total_value?: number;
  currency?: string | null;
  leads?: PipelineLead[];
}

export interface PipelineBoard {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  visibility: PipelineVisibility;
  cover_color: string | null;
  is_default: boolean;
  is_archived: boolean;
  project_id?: number | null;
  workspace?: 'pipeline' | 'estimates';
  background_type?: string;
  background_value?: string | null;
  sort_order: number;
  open_leads_count?: number;
  created_by: number;
  creator?: PipelineUserRef;
  members?: PipelineBoardMember[];
  stages?: PipelineStage[];
  created_at?: string;
  updated_at?: string;
}

export interface PipelineSource {
  id: number;
  business_id: number;
  name: string;
  is_system: boolean;
  sort_order: number;
}

export interface PipelineLabel {
  id: number;
  business_id: number;
  board_id: number | null;
  name: string;
  color: string;
  sort_order: number;
}

export interface PipelineChecklistItem {
  id: number;
  checklist_id: number;
  title: string;
  is_done: boolean;
  sort_order: number;
}

export interface PipelineChecklist {
  id: number;
  lead_id: number;
  title: string;
  sort_order: number;
  items?: PipelineChecklistItem[];
}

export interface PipelineAttachment {
  id: number;
  lead_id: number;
  user_id: number | null;
  file_name: string;
  file_path: string;
  file_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at?: string;
  user?: PipelineUserRef | null;
}

export interface PipelineLead {
  id: number;
  business_id: number;
  board_id: number;
  stage_id: number;
  title: string;
  card_type: PipelineCardType;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  customer_id: number | null;
  converted_customer_id: number | null;
  assigned_to: number | null;
  source_id: number | null;
  estimated_value: number | null;
  currency: string;
  status: PipelineLeadStatus;
  position: number;
  expected_close_date: string | null;
  due_date: string | null;
  start_date: string | null;
  priority: PipelinePriority | null;
  background_color?: string | null;
  checklist_total?: number | null;
  checklist_done?: number | null;
  attachments_count?: number | null;
  won_at: string | null;
  lost_at: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  estimate_id?: number | null;
  board?: { id: number; name: string };
  stage?: { id: number; name: string; color: string | null; is_won: boolean; is_lost: boolean };
  assignee?: PipelineUserRef | null;
  source?: { id: number; name: string } | null;
  customer?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  converted_customer?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  labels?: PipelineLabel[];
  checklists?: PipelineChecklist[];
  attachments?: PipelineAttachment[];
  activities?: PipelineLeadActivity[];
  created_at?: string;
  updated_at?: string;
}

export interface PipelineLeadActivity {
  id: number;
  lead_id: number;
  user_id: number | null;
  type: PipelineActivityType;
  body: string | null;
  metadata?: Record<string, unknown> | null;
  user?: PipelineUserRef | null;
  created_at?: string;
}

export interface PipelineInsightsSummary {
  open_leads: number;
  open_pipeline_value: number;
  won_leads: number;
  lost_leads: number;
  converted_leads: number;
  win_rate_percent: number;
  by_stage: Array<{
    stage_id: number;
    stage_name: string;
    color: string | null;
    sort_order?: number;
    count: number;
    value: number;
  }>;
  by_source: Array<{
    source_id: number | null;
    source_name: string;
    count: number;
    value: number;
  }>;
}

export interface BoardMemberInput {
  user_id: number;
  role: 'editor' | 'viewer';
  name?: string;
}

export interface CreateBoardPayload {
  name: string;
  description?: string;
  visibility: PipelineVisibility;
  cover_color?: string;
  background_type?: string;
  background_value?: string;
  background_type?: string;
  background_value?: string;
  member_ids?: number[];
  members?: BoardMemberInput[];
  workspace?: 'pipeline' | 'estimates';
}

export interface CreateLeadPayload {
  board_id: number;
  stage_id: number;
  title: string;
  card_type?: PipelineCardType;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  customer_id?: number;
  source_id?: number;
  assigned_to?: number;
  estimated_value?: number;
  currency?: string;
  expected_close_date?: string;
  due_date?: string;
  start_date?: string;
  priority?: PipelinePriority;
  label_ids?: number[];
}

export interface UpdateLeadPayload {
  title?: string;
  card_type?: PipelineCardType;
  description?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  customer_id?: number | null;
  source_id?: number | null;
  assigned_to?: number | null;
  estimated_value?: number | null;
  currency?: string;
  expected_close_date?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  priority?: PipelinePriority | null;
  background_color?: string | null;
  lost_reason?: string | null;
  label_ids?: number[];
}

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
  stage: { id: number; name: string; color: string | null } | null;
  assignee: PipelineUserRef | null;
}

export interface PipelineCalendarDay {
  date: string;
  leads: PipelineCalendarLead[];
}
