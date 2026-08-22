import type { PipelinePriority } from './pipelineTypes';

/** Event triggers fire instantly from PipelineLeadService hooks. */
export type AutomationEventTriggerType =
  | 'stage_entered'
  | 'stage_exited'
  | 'status_changed'
  | 'card_created'
  | 'assigned'
  | 'label_added'
  | 'field_changed'
  | 'converted_to_customer';

/** Scheduled triggers are scanned by the every-minute cron engine. */
export type AutomationScheduledTriggerType =
  | 'due_date_passed'
  | 'overdue_by'
  | 'before_due'
  | 'stage_dwell'
  | 'no_activity'
  | 'created_x_days_ago'
  | 'recurring';

export type AutomationTriggerType = AutomationEventTriggerType | AutomationScheduledTriggerType;

export type AutomationFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';

export interface AutomationTriggerConfig {
  type: AutomationTriggerType;
  frequency?: AutomationFrequency;
  /** UTC HH:MM for daily/weekly/monthly/recurring. */
  time?: string;
  /** Weekly: 0=Sunday .. 6=Saturday. */
  days_of_week?: number[];
  /** Monthly: 1-31. */
  day_of_month?: number;
  /** Custom cron expression (5 fields). */
  cron?: string;
  /** Offset in days for overdue_by / before_due / stage_dwell / no_activity / created_x_days_ago. */
  offset_days?: number;
  /** Stage for stage_entered / stage_exited / stage_dwell. */
  stage_id?: number | null;
}

export type AutomationConditionField =
  | 'stage_id'
  | 'status'
  | 'priority'
  | 'card_type'
  | 'assigned_to'
  | 'estimated_value'
  | 'due_date'
  | 'start_date'
  | 'created_at'
  | 'has_label'
  | 'meta';

export type AutomationConditionOperator =
  | 'is'
  | 'is_not'
  | 'is_empty'
  | 'is_not_empty'
  | 'contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'is_before'
  | 'is_after';

export interface AutomationCondition {
  field: AutomationConditionField;
  operator: AutomationConditionOperator;
  value?: unknown;
  /** When field === 'meta'. */
  meta_field_id?: number | null;
}

export type AutomationActionType =
  | 'move_to_stage'
  | 'create_card'
  | 'create_task'
  | 'assign_to'
  | 'add_label'
  | 'remove_label'
  | 'set_priority'
  | 'set_due_date'
  | 'set_field'
  | 'post_conversation'
  | 'notify'
  | 'notify_email'
  | 'create_checklist'
  | 'convert_to_customer'
  | 'copy_card'
  | 'archive'
  | 'webhook';

export interface AutomationActionConfig {
  type: AutomationActionType;
  stage_id?: number | null;
  user_id?: number | null;
  label_id?: number | null;
  priority?: PipelinePriority | null;
  /** Offset in days for set_due_date / create_card. */
  offset_days?: number;
  offset_due_days?: number;
  meta_field_id?: number | null;
  value?: unknown;
  body?: string;
  message?: string;
  title?: string;
  description?: string | null;
  estimated_value?: number | null;
  /** Webhook. */
  url?: string;
}

export interface PipelineAutomationRule {
  id: number;
  board_id: number;
  name: string;
  trigger: AutomationTriggerConfig;
  conditions: AutomationCondition[] | null;
  actions: AutomationActionConfig[];
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  paused_at: string | null;
  created_by: number;
  creator?: { id: number; name: string; avatar?: string | null } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PipelineAutomationRulePayload {
  name: string;
  trigger: AutomationTriggerConfig;
  conditions?: AutomationCondition[] | null;
  actions: AutomationActionConfig[];
  is_active?: boolean;
}