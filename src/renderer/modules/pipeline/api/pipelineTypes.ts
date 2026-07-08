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

export type PipelineBoardMemberRole = 'viewer' | 'contributor' | 'manager';

export interface PipelineBoardMember {
  id: number;
  board_id: number;
  user_id: number;
  role: PipelineBoardMemberRole | 'editor';
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
  /** Server-computed for the current user; prefer over client inference when present. */
  can_contribute?: boolean;
  can_manage_settings?: boolean;
  current_member_role?: PipelineBoardMemberRole | null;
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
  description: string | null;
  is_done: boolean;
  sort_order: number;
}

export interface PipelineChecklist {
  id: number;
  lead_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  items?: PipelineChecklistItem[];
}

export interface CreateChecklistPayload {
  title?: string;
  description?: string | null;
}

export interface CreateChecklistItemPayload {
  checklistId: number;
  title: string;
  description?: string | null;
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
  comments_count?: number | null;
  history_count?: number | null;
  created_by?: number | null;
  creator?: PipelineUserRef | null;
  won_at: string | null;
  lost_at: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  estimate_id?: number | null;
  board?: { id: number; name: string };
  stage?: { id: number; name: string; color: string | null; is_won: boolean; is_lost: boolean };
  assignee?: PipelineUserRef | null;
  assignees?: PipelineUserRef[];
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

export interface PipelineActivityReactions {
  likes: number;
  dislikes: number;
  user_reaction: string | null;
  emoji_counts?: Record<string, number>;
}

export interface PipelineLeadActivity {
  id: number;
  lead_id: number;
  parent_id?: number | null;
  user_id: number | null;
  type: PipelineActivityType;
  body: string | null;
  metadata?: Record<string, unknown> | null;
  reactions?: PipelineActivityReactions;
  user?: PipelineUserRef | null;
  created_at?: string;
}

export interface PipelineBoardAnnouncement {
  id: number;
  board_id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  created_by: number;
  creator?: PipelineUserRef;
  created_at?: string;
  is_read?: boolean;
  read_count?: number | null;
  team_member_count?: number | null;
  can_delete?: boolean;
  can_dismiss?: boolean;
}

export interface PipelinePollParticipant {
  user: PipelineUserRef;
  has_voted: boolean;
  voted_option_id?: number | null;
  voted_option_label?: string | null;
}

export interface PipelinePollOption {
  id: number;
  poll_id: number;
  label: string;
  sort_order: number;
  votes_count?: number | null;
}

export interface PipelinePoll {
  id: number;
  board_id: number;
  lead_id?: number | null;
  question: string;
  closes_at?: string | null;
  allow_multiple: boolean;
  results_visibility?: 'team' | 'creator_only';
  created_by: number;
  creator?: PipelineUserRef;
  options?: PipelinePollOption[];
  votes?: { id: number; poll_id: number; option_id: number; user_id: number }[];
  created_at?: string;
  total_votes?: number | null;
  user_has_voted?: boolean;
  can_see_results?: boolean;
  results_hidden?: boolean;
  participants?: PipelinePollParticipant[];
  can_manage_poll?: boolean;
  can_remove_own_vote?: boolean;
  can_delete?: boolean;
  can_dismiss?: boolean;
}

export interface PipelineBoardCollaborationSummary {
  announcements_count: number;
  unread_announcements_count: number;
  active_polls_count: number;
  polls_pending_vote_count: number;
  attention_count?: number;
  has_attention?: boolean;
}

export type PipelineBoardResourceType = 'file' | 'link' | 'image';
export type PipelineBoardResourceVisibility = 'board' | 'team' | 'members' | 'owner_only';

export interface PipelineBoardResource {
  id: number;
  board_id: number;
  type: PipelineBoardResourceType;
  title: string;
  description?: string | null;
  visibility: PipelineBoardResourceVisibility;
  group_name?: string | null;
  url?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  views_count: number;
  downloads_count: number;
  created_at?: string;
  updated_at?: string;
  owner?: PipelineUserRef | null;
  members?: PipelineUserRef[];
  can_manage?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface PipelineBoardResourcesSummary {
  resources_count: number;
}

export interface PipelineBoardConversationSummary {
  messages_count: number;
  unread_count: number;
  has_unread?: boolean;
  pinned_count?: number;
}

export interface PipelineBoardMessageAttachment {
  id: number;
  message_id: number;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  url: string;
}

export interface PipelineBoardMessage {
  id: number;
  board_id: number;
  parent_id?: number | null;
  user_id: number;
  body: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: number | null;
  edited_at?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: PipelineUserRef | null;
  mentions?: Array<{ user_id: number; user?: PipelineUserRef | null }>;
  attachments?: PipelineBoardMessageAttachment[];
  reactions?: PipelineActivityReactions;
  can_edit?: boolean;
  can_delete?: boolean;
  can_pin?: boolean;
}

export interface PipelineBoardActivityEvent {
  id: number;
  board_id: number;
  event_type: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  user?: PipelineUserRef | null;
}

export interface PipelineBoardAutomation {
  id: number;
  board_id: number;
  name: string;
  trigger_type: 'stage_entered' | 'status_won' | 'status_lost';
  trigger_stage_id?: number | null;
  trigger_stage?: {
    id: number;
    name: string;
    sort_order?: number;
    is_won?: boolean;
    is_lost?: boolean;
    color?: string | null;
  } | null;
  action_type: 'conversation_post' | 'conversation_notify';
  action_body: string;
  is_active: boolean;
  creator?: PipelineUserRef | null;
}

export interface PipelineBoardTemplate {
  id: number;
  name: string;
  description?: string | null;
  workspace: 'pipeline' | 'estimates';
  stages?: Array<Record<string, unknown>>;
  labels?: Array<Record<string, unknown>>;
  resources?: Array<Record<string, unknown>>;
  automations?: Array<Record<string, unknown>>;
  is_system?: boolean;
}

export interface PipelineReminder {
  id: number;
  lead_id: number;
  user_id: number;
  remind_at: string;
  message?: string | null;
  channel: 'in_app' | 'email' | 'both';
  sent_at?: string | null;
  cancelled_at?: string | null;
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

export interface BoardTeamMember {
  id: number;
  name: string;
  email: string | null;
  avatar?: string | null;
  modules: string[];
}

export interface BoardMemberInput {
  user_id: number;
  role: PipelineBoardMemberRole;
  name?: string;
}

export interface CreateBoardPayload {
  name: string;
  description?: string;
  visibility: PipelineVisibility;
  cover_color?: string | null;
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
  assignee_ids?: number[];
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
  assignee_ids?: number[];
  estimated_value?: number | null;
  currency?: string;
  expected_close_date?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  priority?: PipelinePriority | null;
  background_color?: string | null;
  lost_reason?: string | null;
  label_ids?: number[];
  status?: PipelineLeadStatus;
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
