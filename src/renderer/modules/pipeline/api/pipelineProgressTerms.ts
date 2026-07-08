import type { BoardProgressContext } from './boardProgressTypes';
import type { PipelineBoard } from './pipelineTypes';
import { boardUsesTaskTerminology } from './pipelineBoardWorkspace';

export type ProgressPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export const PROGRESS_PERIOD_OPTIONS: { value: ProgressPeriod; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];

export function resolveProgressContext(
  board?: Pick<PipelineBoard, 'project_id' | 'workspace'> | null,
  apiContext?: BoardProgressContext | null,
): BoardProgressContext {
  if (apiContext) return apiContext;
  const usesTaskLanguage = board ? boardUsesTaskTerminology(board) : false;
  return {
    is_project_board: Boolean(board?.project_id),
    is_pipeline_board: !board?.project_id && (board?.workspace === 'pipeline' || !board?.workspace),
    uses_task_language: usesTaskLanguage,
    item_singular: usesTaskLanguage ? 'task' : 'lead',
    item_plural: usesTaskLanguage ? 'tasks' : 'leads',
    board_kind: board?.project_id ? 'project' : (board?.workspace === 'estimates' ? 'estimates' : 'pipeline'),
    won_label: usesTaskLanguage ? 'completed' : 'won',
    lost_label: usesTaskLanguage ? 'cancelled' : 'lost',
    currency: 'UGX',
  };
}

export function progressBoardTitle(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) return 'Project progress';
  if (ctx.board_kind === 'estimates') return 'Board progress';
  return 'Pipeline progress';
}

export function progressBoardSubtitle(ctx: BoardProgressContext): string {
  if (ctx.is_project_board) {
    return 'Measure task throughput, completions, and team performance on this project board.';
  }
  if (ctx.board_kind === 'estimates') {
    return 'Track task movement, outcomes, and team performance on this board.';
  }
  return 'Track lead flow, wins, pipeline value, and team performance on this sales board.';
}

export const PROGRESS_METRIC_KEYS = [
  'cards_created',
  'cards_won',
  'cards_lost',
  'cards_converted',
  'cards_open',
  'pipeline_value_open',
  'pipeline_value_won',
  'win_rate',
  'conversion_rate',
  'avg_cycle_days',
  'cards_moved',
  'comments_posted',
  'checklist_items_done',
  'overdue_cards',
] as const;

export type ProgressMetricKey = (typeof PROGRESS_METRIC_KEYS)[number];

export function metricUnitForKey(key: string): 'count' | 'currency' | 'percent' | 'days' {
  if (key === 'pipeline_value_open' || key === 'pipeline_value_won') return 'currency';
  if (key === 'win_rate' || key === 'conversion_rate') return 'percent';
  if (key === 'avg_cycle_days') return 'days';
  return 'count';
}

export const METRIC_LABELS: Record<string, (ctx: BoardProgressContext) => string> = {
  cards_created: (ctx) => `${capitalize(ctx.item_plural)} created`,
  cards_won: (ctx) => `${capitalize(ctx.item_plural)} ${ctx.won_label}`,
  cards_lost: (ctx) => `${capitalize(ctx.item_plural)} ${ctx.lost_label}`,
  cards_converted: (ctx) => ctx.is_pipeline_board ? 'Leads converted' : `${capitalize(ctx.item_plural)} converted`,
  cards_open: (ctx) => `Open ${ctx.item_plural}`,
  pipeline_value_open: (ctx) => ctx.is_pipeline_board ? 'Open pipeline value' : 'Open estimated value',
  pipeline_value_won: (ctx) => ctx.is_pipeline_board ? 'Won value' : 'Completed value',
  win_rate: (ctx) => ctx.is_pipeline_board ? 'Win rate' : 'Completion rate',
  conversion_rate: (ctx) => 'Conversion rate',
  avg_cycle_days: (ctx) => ctx.is_pipeline_board ? 'Avg days to win' : 'Avg days to complete',
  cards_moved: (ctx) => `${capitalize(ctx.item_plural)} moved`,
  comments_posted: () => 'Comments posted',
  checklist_items_done: () => 'Checklist items done',
  overdue_cards: (ctx) => `Overdue ${ctx.item_plural}`,
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  kpi: 'KPI',
  goal: 'Goal',
  objective: 'Objective',
  key_result: 'Key result',
};

export const PACE_STATUS_LABELS: Record<string, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  behind: 'Behind',
  achieved: 'Achieved',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
