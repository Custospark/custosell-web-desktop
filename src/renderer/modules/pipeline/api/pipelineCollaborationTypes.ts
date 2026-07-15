import type { PipelineUserRef, PipelineActivityReactions } from './pipelineTypes';

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
  can_edit_poll?: boolean;
  is_closed?: boolean;
  can_vote?: boolean;
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
  is_system?: boolean;
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
