export type PerformanceVerdict = 'on_track' | 'at_risk' | 'behind' | 'no_data' | 'unlinked';

export interface HrPerformanceGoalItem {
  id: number;
  title: string;
  type: string;
  board_id: number;
  board_name?: string | null;
  workspace?: string | null;
  metric_key: string;
  /** Overall / root goal (e.g. month = 60). */
  target_value: number;
  /** Expected for the selected Talent period (e.g. day = 2). */
  expected_value: number;
  actual_value: number;
  unit?: string | null;
  progress_percent: number;
  pace_status: string;
  period_start?: string | null;
  period_end?: string | null;
  view_period_type?: string | null;
  period_slice?: {
    planning_level?: string;
    period_start?: string;
    period_end?: string;
    view_period_type?: string | null;
    expected_value: number;
    expected_to_date?: number;
    actual_value: number;
    progress_percent: number;
    pace_status: string;
    root_target_value: number;
  } | null;
}

export interface HrPerformancePeriod {
  type: string;
  start: string;
  end: string;
}

export interface HrPerformanceRosterRow {
  employee_id: number;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_number: string;
    status: string;
    user_id?: number | null;
  };
  user_id?: number | null;
  link_status: 'linked' | 'unlinked';
  verdict: PerformanceVerdict;
  verdict_label: string;
  goal_progress_avg: number;
  goals_on_track: number;
  goals_total: number;
  leads_open: number;
  leads_overdue: number;
  tasks_open: number;
  tasks_overdue: number;
  tasks_done: number;
  period?: HrPerformancePeriod;
  evaluated_at: string;
}

export interface HrPerformanceSnapshot {
  employee: HrPerformanceRosterRow['employee'];
  user_id?: number | null;
  link_status: 'linked' | 'unlinked';
  verdict: PerformanceVerdict;
  verdict_label: string;
  period: HrPerformancePeriod;
  leads: {
    total: number;
    open: number;
    won: number;
    lost: number;
    converted: number;
    overdue: number;
    win_rate: number;
  };
  project_tasks: {
    total: number;
    open: number;
    done: number;
    cancelled: number;
    overdue: number;
    completion_rate: number;
  };
  goals: {
    total: number;
    average_progress_percent: number;
    on_track_count: number;
    at_risk_count: number;
    behind_count: number;
    items: HrPerformanceGoalItem[];
  };
  recent_leads: Array<{
    id: number;
    title: string;
    status: string;
    due_date?: string | null;
    board_id?: number | null;
    board_name?: string | null;
    workspace?: string | null;
    stage_name?: string | null;
  }>;
  recent_tasks: Array<{
    id: number;
    name: string;
    status: string;
    due_date?: string | null;
    project_id: number;
    project_name?: string | null;
  }>;
  evaluated_at: string;
}
