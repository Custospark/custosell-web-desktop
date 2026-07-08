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

export type BoardProgressFunnelStage = {
  stage_id: number;
  stage_name: string;
  color: string | null;
  count: number;
  open_value: number;
  is_won: boolean;
  is_lost: boolean;
};

export type BoardTargetPaceStatus = 'on_track' | 'at_risk' | 'behind' | 'achieved';

export type BoardTargetType = 'kpi' | 'goal' | 'objective' | 'key_result';

export type BoardTarget = {
  id: number;
  parent_id: number | null;
  type: BoardTargetType;
  title: string;
  description: string | null;
  metric_key: string;
  target_value: number;
  actual_value: number;
  unit: 'count' | 'currency' | 'percent' | 'days';
  period_type: string;
  period_start: string;
  period_end: string;
  scope: 'board' | 'member';
  member_user_id: number | null;
  member: { id: number; name: string; avatar: string | null } | null;
  weight: number;
  status: string;
  progress_percent: number;
  pace_status: BoardTargetPaceStatus;
  key_results: BoardTarget[];
};

export type BoardProgressSummary = {
  board_id: number;
  period: BoardProgressPeriod;
  context: BoardProgressContext;
  team: BoardProgressTeamMetrics;
  members: BoardProgressMember[];
  trends: BoardProgressTrendPoint[];
  funnel: BoardProgressFunnelStage[];
  targets: BoardTarget[];
  can_manage_targets: boolean;
};

export type CreateBoardTargetPayload = {
  type: BoardTargetType;
  parent_id?: number | null;
  title: string;
  description?: string | null;
  metric_key: string;
  target_value: number;
  unit: 'count' | 'currency' | 'percent' | 'days';
  period_type: string;
  period_start?: string;
  period_end?: string;
  scope: 'board' | 'member';
  member_user_id?: number | null;
  weight?: number;
  status?: string;
  key_results?: Array<{
    title: string;
    metric_key: string;
    target_value: number;
    unit: 'count' | 'currency' | 'percent' | 'days';
    scope?: 'board' | 'member';
    member_user_id?: number | null;
  }>;
};
