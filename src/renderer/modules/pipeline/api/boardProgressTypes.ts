export type PlanningLevel = 'decade' | 'five_year' | 'year' | 'quarter' | 'month' | 'week' | 'day';

export type GoalTag = 'kpi' | 'goal' | 'objective' | 'deliverable' | 'decision';

export type DecompositionMode = 'equal' | 'velocity' | 'hybrid';

export type BoardProgressContext = {
  is_project_board: boolean;
  is_pipeline_board: boolean;
  uses_task_language: boolean;
  item_singular: string;
  item_plural: string;
  board_kind: 'project' | 'estimates' | 'pipeline';
  won_label: string;
  lost_label: string;
  currency: string;
};

export type BoardProgressStage = {
  stage_id: number;
  stage_name: string;
  color: string | null;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
};

export type BoardProgressPeriod = {
  type: string;
  start: string;
  end: string;
};

export type BoardProgressTeamMetrics = Record<string, number>;

export type BoardProgressMember = {
  user_id: number;
  name: string;
  avatar: string | null;
  metrics: Record<string, number>;
};

export type BoardProgressTrendPoint = {
  date: string;
  cards_created: number;
  cards_won: number;
  cards_lost: number;
  pipeline_value_won: number;
};

export type BoardProgressExpectedTrendPoint = {
  date: string;
  expected: number;
};

export type BoardProgressFunnelStage = {
  stage_id: number;
  stage_name: string;
  color: string | null;
  count: number;
  open_value: number;
  is_won: boolean;
  is_lost: boolean;
};

export type ColumnMetricRow = {
  stage_id: number;
  stage_name: string;
  color: string | null;
  is_won: boolean;
  is_lost: boolean;
  metrics: Record<string, number>;
};

export type BoardTargetPaceStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved';

export type BoardTargetType = 'kpi' | 'goal' | 'objective' | 'key_result';

export type TargetAllocation = {
  id?: number;
  planning_level: PlanningLevel;
  period_start: string;
  period_end: string;
  expected_value: number;
  expected_to_date?: number;
  actual_value?: number;
  stage_id: number | null;
  member_user_id: number | null;
  weight: number;
  is_override: boolean;
  progress_percent?: number;
};

export type TargetPeriodSlice = {
  planning_level: PlanningLevel;
  period_start: string;
  period_end: string;
  view_period_type?: string | null;
  expected_value: number;
  expected_to_date: number;
  actual_value: number;
  progress_percent: number;
  pace_status: BoardTargetPaceStatus;
  root_target_value: number;
};

export type BoardTarget = {
  id: number;
  parent_id: number | null;
  type: BoardTargetType;
  goal_tag?: GoalTag | null;
  title: string;
  description: string | null;
  metric_key: string;
  target_value: number;
  actual_value: number;
  unit: 'count' | 'currency' | 'percent' | 'days';
  period_type: string;
  planning_level?: PlanningLevel | null;
  anchor_start?: string | null;
  anchor_end?: string | null;
  period_start: string;
  period_end: string;
  scope: 'board' | 'member';
  member_user_id: number | null;
  member: { id: number; name: string; avatar: string | null } | null;
  stage_id?: number | null;
  weight: number;
  status: string;
  decomposition_mode?: DecompositionMode;
  progress_percent: number;
  pace_status: BoardTargetPaceStatus;
  period_slice?: TargetPeriodSlice;
  allocations?: TargetAllocation[];
  key_results: BoardTarget[];
};

export type PaceAlert = {
  target_id: number;
  title: string;
  pace_status: BoardTargetPaceStatus;
  progress_percent: number;
};

export type CapacityRecommendation = {
  stage_id: number;
  stage_name: string;
  type: 'bottleneck' | 'capacity' | 'healthy';
  message: string;
  suggested_weekly_capacity: number;
  avg_dwell_days?: number;
  throughput_90d?: number;
};

export type ProgressChartConfig = {
  charts: Array<{
    id: string;
    type: 'bar' | 'line' | 'stacked';
    metric?: string;
    metrics?: string[];
    stage_ids: number[];
  }>;
  funnel_mode: 'count' | 'value';
};

export type BoardProgressSummary = {
  board_id: number;
  period: BoardProgressPeriod;
  context: BoardProgressContext;
  stages?: BoardProgressStage[];
  selected_stage_ids?: number[];
  team: BoardProgressTeamMetrics;
  members: BoardProgressMember[];
  trends: BoardProgressTrendPoint[];
  expected_trends?: BoardProgressExpectedTrendPoint[];
  funnel: BoardProgressFunnelStage[];
  column_metrics?: ColumnMetricRow[];
  column_trends?: Array<{ date: string; stages: Record<number, { throughput: number; count: number }> }>;
  targets: BoardTarget[];
  chart_config?: ProgressChartConfig;
  pace_alerts?: PaceAlert[];
  capacity_recommendations?: CapacityRecommendation[];
  can_manage_targets: boolean;
};

export type DecompositionPreview = {
  planning_level: PlanningLevel;
  anchor_start: string;
  anchor_end: string;
  target_value: number;
  stage_ids: number[];
  decomposition_mode: DecompositionMode;
  nodes: TargetAllocation[];
};

export type MyProgressSummary = {
  user_id: number;
  period: BoardProgressPeriod;
  context: BoardProgressContext;
  metrics: Record<string, number>;
  targets: BoardTarget[];
  team_average: Record<string, number>;
  pace_alerts: PaceAlert[];
  selected_stage_ids: number[];
  column_metrics: ColumnMetricRow[];
};

export type CreateBoardTargetPayload = {
  type: BoardTargetType;
  goal_tag?: GoalTag;
  parent_id?: number | null;
  title: string;
  description?: string | null;
  metric_key: string;
  target_value: number;
  unit: 'count' | 'currency' | 'percent' | 'days';
  period_type: string;
  planning_level?: PlanningLevel;
  anchor_start?: string;
  anchor_end?: string;
  period_start?: string;
  period_end?: string;
  scope: 'board' | 'member';
  member_user_id?: number | null;
  stage_id: number;
  stage_ids?: number[];
  decomposition_mode?: DecompositionMode;
  weight?: number;
  status?: string;
  allocations?: TargetAllocation[];
  key_results?: Array<{
    title: string;
    metric_key: string;
    target_value: number;
    unit: 'count' | 'currency' | 'percent' | 'days';
    scope?: 'board' | 'member';
    member_user_id?: number | null;
    stage_id?: number;
  }>;
};

export type DecomposePreviewPayload = {
  planning_level: PlanningLevel;
  target_value: number;
  anchor_start?: string;
  anchor_end?: string;
  stage_ids: number[];
  member_user_ids?: number[];
  decomposition_mode?: DecompositionMode;
};
