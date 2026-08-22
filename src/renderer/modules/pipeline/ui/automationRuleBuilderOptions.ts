import type {
  AutomationActionConfig,
  AutomationActionType,
  AutomationConditionField,
  AutomationConditionOperator,
  AutomationFrequency,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '../api/pipelineAutomationRuleTypes';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const TRIGGER_OPTIONS: Option<AutomationTriggerType>[] = [
  { value: 'stage_entered', label: 'Card enters a stage' },
  { value: 'stage_exited', label: 'Card leaves a stage' },
  { value: 'status_changed', label: 'Status changes' },
  { value: 'card_created', label: 'Card is created' },
  { value: 'assigned', label: 'Card is assigned' },
  { value: 'label_added', label: 'Label is added' },
  { value: 'field_changed', label: 'A field changes' },
  { value: 'converted_to_customer', label: 'Lead converts to customer' },
  { value: 'due_date_passed', label: 'Due date passes' },
  { value: 'overdue_by', label: 'Card is overdue by' },
  { value: 'before_due', label: 'Before due date' },
  { value: 'stage_dwell', label: 'Card stays in a stage for' },
  { value: 'no_activity', label: 'No activity for' },
  { value: 'created_x_days_ago', label: 'Created X days ago' },
  { value: 'recurring', label: 'Recurring (creates cards on a schedule)' },
];

export const SCHEDULED_TRIGGERS: AutomationTriggerType[] = [
  'due_date_passed',
  'overdue_by',
  'before_due',
  'stage_dwell',
  'no_activity',
  'created_x_days_ago',
  'recurring',
];

export const FREQUENCY_OPTIONS: Option<AutomationFrequency>[] = [
  { value: 'once', label: 'Once (next scan)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly (choose days)' },
  { value: 'monthly', label: 'Monthly (day of month)' },
  { value: 'cron', label: 'Custom cron' },
];

export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export const CONDITION_FIELD_OPTIONS: Option<AutomationConditionField>[] = [
  { value: 'stage_id', label: 'Stage' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'card_type', label: 'Card type' },
  { value: 'assigned_to', label: 'Assignee' },
  { value: 'estimated_value', label: 'Estimated value' },
  { value: 'due_date', label: 'Due date' },
  { value: 'start_date', label: 'Start date' },
  { value: 'created_at', label: 'Created at' },
  { value: 'has_label', label: 'Has label' },
  { value: 'meta', label: 'Custom field' },
];

export const TEXT_OPERATORS: Option<AutomationConditionOperator>[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'contains', label: 'contains' },
];

export const NUMBER_OPERATORS: Option<AutomationConditionOperator>[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

export const DATE_OPERATORS: Option<AutomationConditionOperator>[] = [
  { value: 'is_before', label: 'is before' },
  { value: 'is_after', label: 'is after' },
  { value: 'is', label: 'is on' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

export const ACTION_OPTIONS: Option<AutomationActionType>[] = [
  { value: 'move_to_stage', label: 'Move card to a stage' },
  { value: 'create_card', label: 'Create a card' },
  { value: 'create_task', label: 'Create a task' },
  { value: 'assign_to', label: 'Assign to a member' },
  { value: 'add_label', label: 'Add a label' },
  { value: 'remove_label', label: 'Remove a label' },
  { value: 'set_priority', label: 'Set priority' },
  { value: 'set_due_date', label: 'Set due date' },
  { value: 'set_field', label: 'Set a custom field' },
  { value: 'post_conversation', label: 'Post to discussion' },
  { value: 'notify', label: 'Notify a member' },
  { value: 'notify_email', label: 'Email a member' },
  { value: 'create_checklist', label: 'Create a checklist' },
  { value: 'convert_to_customer', label: 'Convert to customer' },
  { value: 'copy_card', label: 'Copy the card' },
  { value: 'archive', label: 'Archive the card' },
  { value: 'webhook', label: 'Call a webhook' },
];

export const STATUS_OPTIONS: Option<string>[] = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'converted', label: 'Converted' },
  { value: 'archived', label: 'Archived' },
];

export const PRIORITY_OPTIONS: Option<string>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const CARD_TYPE_OPTIONS: Option<string>[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'card', label: 'Card' },
  { value: 'task', label: 'Task' },
];

export function operatorsForField(field: AutomationConditionField): Option<AutomationConditionOperator>[] {
  if (field === 'estimated_value') return NUMBER_OPERATORS;
  if (field === 'due_date' || field === 'start_date' || field === 'created_at') return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

/** Draft-friendly clone so edits never mutate a cached rule. */
export function cloneTriggerConfig(rule?: { trigger: Record<string, unknown> } | null): Record<string, unknown> {
  return rule?.trigger ? { ...rule.trigger } : { type: 'stage_entered' };
}

export function cloneCondition(condition?: Record<string, unknown>): Record<string, unknown> {
  return condition ? { ...condition } : { field: 'status', operator: 'is', value: 'open' };
}

export function cloneAction(action?: Record<string, unknown>): Record<string, unknown> {
  return action ? { ...action } : { type: 'move_to_stage' };
}

/** True when the stored conditions are an OR group wrapper {logic, conditions}. */
export function isOrGroup(conditions?: unknown): boolean {
  if (!conditions || typeof conditions !== 'object') return false;
  const candidate = conditions as { logic?: unknown; conditions?: unknown };
  return candidate.logic === 'or' && Array.isArray(candidate.conditions);
}

export function isValidRuleDraft(draft: {
  name: string;
  trigger: AutomationTriggerConfig;
  actions: AutomationActionConfig[];
}): boolean {
  if (draft.name.trim() === '') return false;
  if (!draft.trigger?.type) return false;
  if (!Array.isArray(draft.actions) || draft.actions.length === 0) return false;
  return true;
}