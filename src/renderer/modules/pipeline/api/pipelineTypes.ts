export type {
  PipelineBoardAnnouncement,
  PipelinePollParticipant,
  PipelinePollOption,
  PipelinePoll,
  PipelineBoardCollaborationSummary,
  PipelineBoardResourceType,
  PipelineBoardResourceVisibility,
  PipelineBoardResource,
  PipelineBoardResourcesSummary,
  PipelineBoardConversationSummary,
  PipelineBoardMessageAttachment,
  PipelineBoardMessage,
  PipelineBoardActivityEvent,
  PipelineBoardAutomation,
  PipelineBoardTemplate,
} from './pipelineCollaborationTypes';

export type {
  PipelineCalendarDateField,
  PipelineCalendarDateKind,
  PipelineCalendarLead,
  PipelineCalendarDay,
} from './pipelineCalendarTypes';

export type BoardViewMode = 'kanban' | 'calendar' | 'progress' | 'fame';

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

export interface PipelineLeadLink {
  id: number;
  lead_id: number;
  linked_lead_id: number | null;
  linked_board_id: number | null;
  label: string | null;
  created_by: number | null;
  creator?: { id: number; name: string } | null;
  linked_lead?: {
    id: number;
    title: string;
    card_type: PipelineCardType;
    board_id: number;
    stage_id: number;
    board?: { id: number; name: string } | null;
    stage?: { id: number; name: string; color: string | null } | null;
  } | null;
  linked_board?: {
    id: number;
    name: string;
    workspace?: string | null;
  } | null;
  created_at?: string;
}

export type MetaFieldType = 'text' | 'number' | 'date' | 'select' | 'multi_select';

export interface PipelineBoardMetaField {
  id: number;
  board_id: number;
  name: string;
  type: MetaFieldType;
  options?: string[] | null;
  sort_order: number;
  required: boolean;
  created_at?: string;
}

export interface PipelineLeadMetaValue {
  id: number;
  lead_id: number;
  meta_field_id: number;
  value: string | null;
  meta_field?: PipelineBoardMetaField | null;
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

export type PipelineAttachmentType = 'file' | 'link';

export interface PipelineAttachment {
  id: number;
  lead_id: number;
  user_id: number | null;
  type?: PipelineAttachmentType;
  file_name: string;
  file_path: string;
  file_url: string | null;
  link_url?: string | null;
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
  booking_status?: 'pending' | 'approved' | 'rejected' | 'completed' | null;
  meeting_link?: string | null;
  reference_code?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  meetings?: PipelineLeadMeeting[];
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
  can_edit?: boolean;
  can_delete?: boolean;
  created_at?: string;
}

export interface PipelineLeadMeeting {
  id: number;
  lead_id: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  meeting_link: string | null;
  notes: string | null;
  reference_code: string | null;
  rejection_reason: string | null;
  created_by: number | null;
  created_at: string | null;
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
  send_notification?: boolean;
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
  booking_status?: 'pending' | 'approved' | 'rejected' | 'completed' | null;
  meeting_link?: string | null;
  background_color?: string | null;
  lost_reason?: string | null;
  label_ids?: number[];
  status?: PipelineLeadStatus;
}

export type WallFamePostType = 'quote' | 'shoutout' | 'performer' | 'milestone';

export interface WallFamePost {
  id: number;
  business_id: number;
  board_id: number | null;
  created_by: number;
  creator?: { id: number; name: string };
  type: WallFamePostType;
  title: string | null;
  content: string;
  photo_url: string | null;
  staff_id: number | null;
  staff?: { id: number; name: string; avatar?: string | null } | null;
  author_name: string | null;
  expires_at: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWallPostPayload {
  type: WallFamePostType;
  title?: string;
  content: string;
  author_name?: string;
  staff_id?: number;
  photo?: File | null;
  board_id?: number;
  expires_at?: string;
  pinned?: boolean;
}
