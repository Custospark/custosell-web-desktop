import type { LucideIcon } from 'lucide-react';
import { BarChart3, CalendarDays, Crosshair, Flag, Gauge, Hash } from 'lucide-react';
import type {
  BoardProgressContext,
  BoardTargetType,
  DecompositionMode,
  GoalTag,
  PlanningLevel,
} from '../api/boardProgressTypes';
import {
  METRIC_LABELS,
  PROGRESS_METRIC_KEYS,
  metricUnitForKey,
} from '../api/pipelineProgressTerms';

export type KeyResultDraft = {
  title: string;
  metric_key: string;
  target_value: string;
};

export type BoardTargetFormState = {
  type: BoardTargetType;
  goal_tag: GoalTag;
  title: string;
  description: string;
  metric_key: string;
  target_value: string;
  scope: 'board' | 'member';
  member_user_id: number | '';
  planning_level: PlanningLevel;
  stage_id: number | '';
  decomposition_mode: DecompositionMode;
};

export const TARGET_TYPE_OPTIONS: {
  value: 'kpi' | 'goal' | 'objective';
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'kpi',
    label: 'KPI',
    description: 'Track a core performance number',
    icon: Gauge,
  },
  {
    value: 'goal',
    label: 'Goal',
    description: 'Set a clear outcome to hit',
    icon: Flag,
  },
  {
    value: 'objective',
    label: 'Objective',
    description: 'Bundle key results into an OKR',
    icon: Crosshair,
  },
];

export const emptyKeyResult = (): KeyResultDraft => ({
  title: '',
  metric_key: 'cards_won',
  target_value: '',
});

export const emptyBoardTargetForm = (): BoardTargetFormState => ({
  type: 'kpi',
  goal_tag: 'kpi',
  title: '',
  description: '',
  metric_key: 'cards_won',
  target_value: '',
  scope: 'board',
  member_user_id: '',
  planning_level: 'year',
  stage_id: '',
  decomposition_mode: 'hybrid',
});

export function goalTagForType(type: BoardTargetType): GoalTag {
  if (type === 'objective') return 'objective';
  if (type === 'goal') return 'goal';
  return 'kpi';
}

export function metricOptions(ctx: BoardProgressContext) {
  return PROGRESS_METRIC_KEYS.map((key) => ({
    value: key,
    label: METRIC_LABELS[key]?.(ctx) ?? key,
  }));
}

export function unitLabel(unit: ReturnType<typeof metricUnitForKey>): string {
  switch (unit) {
    case 'currency':
      return 'Amount';
    case 'percent':
      return 'Percent';
    case 'days':
      return 'Days';
    default:
      return 'Count';
  }
}

export function unitSuffix(unit: ReturnType<typeof metricUnitForKey>, currency: string): string {
  switch (unit) {
    case 'currency':
      return currency;
    case 'percent':
      return '%';
    case 'days':
      return 'days';
    default:
      return '';
  }
}

export function targetValueIconForUnit(unit: ReturnType<typeof metricUnitForKey>): LucideIcon {
  if (unit === 'percent') return BarChart3;
  if (unit === 'days') return CalendarDays;
  return Hash;
}
