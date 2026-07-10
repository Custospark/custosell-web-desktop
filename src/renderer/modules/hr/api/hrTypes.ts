export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'casual';
export type EmployeeStatus = 'onboarding' | 'active' | 'on_leave' | 'terminated';
export type AttendanceEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
export type AttendanceDayStatus = 'present' | 'absent' | 'leave' | 'holiday';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayRunStatus = 'draft' | 'calculated' | 'approved' | 'posted' | 'void';
export type OnboardingTaskStatus = 'pending' | 'done' | 'skipped';
export type ReviewStatus = 'draft' | 'submitted' | 'completed';

export interface HrUserRef {
  id: number;
  name: string;
  email?: string | null;
  avatar?: string | null;
}

export interface HrDepartment {
  id: number;
  business_id: number;
  name: string;
  description?: string | null;
  sort_order: number;
  positions_count?: number;
  employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HrPosition {
  id: number;
  business_id: number;
  department_id?: number | null;
  title: string;
  description?: string | null;
  department?: HrDepartment | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrEmployee {
  id: number;
  business_id: number;
  user_id?: number | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  department_id?: number | null;
  position_id?: number | null;
  manager_employee_id?: number | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date?: string | null;
  termination_date?: string | null;
  notes?: string | null;
  department?: HrDepartment | null;
  position?: HrPosition | null;
  manager?: HrEmployeeRef | null;
  user?: HrUserRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrEmployeeRef {
  id: number;
  first_name: string;
  last_name: string;
  employee_number?: string;
  status?: EmployeeStatus;
}

export interface HrAttendanceEvent {
  id: number;
  employee_id: number;
  type: AttendanceEventType;
  occurred_at: string;
  source?: string | null;
  note?: string | null;
  employee?: HrEmployeeRef | null;
}

export interface HrAttendanceDay {
  id: number;
  employee_id: number;
  work_date: string;
  status: AttendanceDayStatus;
  minutes_worked?: number | null;
  notes?: string | null;
  employee?: HrEmployeeRef | null;
}

export interface HrAttendanceRegister {
  days?: HrAttendanceDay[];
  events?: HrAttendanceEvent[];
  data?: HrAttendanceDay[];
}

export interface HrLeaveType {
  id: number;
  business_id: number;
  name: string;
  code: string;
  paid: boolean;
  days_per_year: number;
  requires_approval: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HrLeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  remaining?: number;
  employee?: HrEmployeeRef | null;
  leave_type?: HrLeaveType | null;
}

export interface HrLeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveRequestStatus;
  reason?: string | null;
  reviewer_id?: number | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  employee?: HrEmployeeRef | null;
  leave_type?: HrLeaveType | null;
  reviewer?: HrUserRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrSalaryStructure {
  id: number;
  business_id: number;
  name: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface HrCompensation {
  id: number;
  business_id: number;
  employee_id: number;
  structure_id?: number | null;
  basic_salary: number;
  allowances_json?: Record<string, number> | null;
  deductions_json?: Record<string, number> | null;
  effective_from: string;
  employee?: HrEmployeeRef | null;
  structure?: HrSalaryStructure | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrPayRunLine {
  id: number;
  pay_run_id: number;
  employee_id: number;
  gross: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  other_deductions: number;
  net: number;
  breakdown_json?: Record<string, unknown> | null;
  employee?: HrEmployeeRef | null;
  payslip?: HrPayslip | null;
}

export interface HrPayRun {
  id: number;
  business_id: number;
  period_start: string;
  period_end: string;
  status: PayRunStatus;
  posted_journal_entry_id?: number | null;
  settlement_journal_entry_id?: number | null;
  statutory_journal_entry_id?: number | null;
  posted_at?: string | null;
  net_settled_at?: string | null;
  statutory_remitted_at?: string | null;
  voided_at?: string | null;
  posting_note?: string | null;
  lines?: HrPayRunLine[];
  lines_count?: number;
  total_gross?: number;
  total_net?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HrPayslip {
  id: number;
  pay_run_line_id: number;
  employee_id: number;
  payload_json?: Record<string, unknown> | null;
  issued_at?: string | null;
  employee?: HrEmployeeRef | null;
}

export interface HrOnboardingTemplate {
  id: number;
  business_id: number;
  name: string;
  tasks_json?: Array<{ title: string; due_offset_days?: number }> | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrOnboardingTask {
  id: number;
  employee_id: number;
  template_id?: number | null;
  title: string;
  status: OnboardingTaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  employee?: HrEmployeeRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrReview {
  id: number;
  employee_id: number;
  reviewer_user_id?: number | null;
  period_label: string;
  status: ReviewStatus;
  rating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  notes?: string | null;
  employee?: HrEmployeeRef | null;
  reviewer?: HrUserRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface HrAuditLog {
  id: number;
  actor_user_id?: number | null;
  action: string;
  subject_type: string;
  subject_id?: number | null;
  meta_json?: Record<string, unknown> | null;
  actor?: HrUserRef | null;
  created_at?: string;
}

export interface HrPayeReportRow {
  employee_id: number;
  employee_name?: string;
  employee_number?: string;
  gross: number;
  paye: number;
  period_start?: string;
  period_end?: string;
  pay_run_id?: number;
}

export interface HrNssfReportRow {
  employee_id: number;
  employee_name?: string;
  employee_number?: string;
  pensionable?: number;
  nssf_employee: number;
  nssf_employer: number;
  period_start?: string;
  period_end?: string;
  pay_run_id?: number;
}

export interface HrStatutoryReport {
  rows: Array<HrPayeReportRow | HrNssfReportRow>;
  period_start?: string;
  period_end?: string;
  pay_run_id?: number | null;
  totals?: Record<string, number>;
}

export type HrPayrollAffordabilityStatus = 'healthy' | 'tight' | 'critical' | 'unknown';

export interface HrPayrollAffordabilityPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export interface HrPayrollAffordabilityCash {
  cash_1101: number;
  bank_1102: number;
  cash_available: number;
}

export interface HrPayrollAffordabilityLiabilities {
  salaries_payable_2110: number;
  paye_payable_2111: number;
  nssf_payable_2112: number;
  unpaid_payroll_liabilities: number;
}

export interface HrPayrollAffordabilityBurn {
  employee_count: number;
  employees_missing_compensation: number;
  gross: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  other_deductions: number;
  net: number;
  monthly_employer_cash_cost: number;
  monthly_burn: number;
}

export interface HrPayrollAffordabilityCoverage {
  cash_after_arrears: number;
  runway_months: number | null;
  runway_months_floor: number;
  can_clear_arrears: boolean;
  status: HrPayrollAffordabilityStatus;
}

export interface HrPayrollAffordabilityMonth {
  offset: number;
  label: string;
  month_start: string;
  need: number;
  cash_available: number;
  surplus_deficit: number;
  can_cover: boolean;
}

export interface HrPayrollAffordabilityHireCalc {
  gross: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  net: number;
  employer_cash_cost: number;
}

export interface HrPayrollAffordabilityHireScenario {
  incremental_monthly_burn: number;
  hire_calc: HrPayrollAffordabilityHireCalc;
  coverage: HrPayrollAffordabilityCoverage;
  months: HrPayrollAffordabilityMonth[];
}

export interface HrPayrollAffordability {
  as_of_date: string;
  period: HrPayrollAffordabilityPeriod;
  cash: HrPayrollAffordabilityCash;
  liabilities: HrPayrollAffordabilityLiabilities;
  burn: HrPayrollAffordabilityBurn;
  coverage: HrPayrollAffordabilityCoverage;
  months: HrPayrollAffordabilityMonth[];
  warnings: string[];
  hire_scenario: HrPayrollAffordabilityHireScenario | null;
}

export type HrPayrollAffordabilityLineItem = {
  label?: string;
  amount?: number | string;
  [key: string]: unknown;
};

export type HrPayrollAffordabilityHirePayload = {
  basic_salary: number;
  allowances?: HrPayrollAffordabilityLineItem[];
  deductions?: HrPayrollAffordabilityLineItem[];
  start_month_offset?: number;
};

export type HrPayrollAffordabilityRequest = {
  as_of_date?: string | null;
  period_id?: number | null;
  horizon_months?: number;
  hire?: HrPayrollAffordabilityHirePayload | null;
};

export type CreateDepartmentPayload = {
  name: string;
  description?: string | null;
  sort_order?: number;
};

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export type CreatePositionPayload = {
  title: string;
  department_id?: number | null;
  description?: string | null;
};

export type UpdatePositionPayload = Partial<CreatePositionPayload>;

export type CreateEmployeePayload = {
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  department_id?: number | null;
  position_id?: number | null;
  manager_employee_id?: number | null;
  employment_type: EmploymentType;
  status?: EmployeeStatus;
  hire_date?: string | null;
  notes?: string | null;
  user_id?: number | null;
};

export type CreateEmployeeWithAccountPayload = CreateEmployeePayload & {
  email: string;
  password: string;
  password_confirmation: string;
  role_id?: number | null;
  modules?: string[];
  account_name?: string;
};

export type CreateEmployeeAccountPayload = {
  email: string;
  password: string;
  password_confirmation: string;
  role_id?: number | null;
  modules?: string[];
  phone?: string | null;
  account_name?: string;
};

export type HrAccountOptions = {
  roles: Array<{ id: number; name: string; slug?: string | null }>;
  unlinked_users: Array<{ id: number; name: string; email: string; phone?: string | null }>;
  assignable_modules: string[];
};

export type UpdateEmployeePayload = Partial<CreateEmployeePayload> & {
  termination_date?: string | null;
};

export type ClockPayload = {
  employee_id: number;
  type: AttendanceEventType;
  occurred_at?: string;
  note?: string | null;
};

export type UpdateAttendanceDayPayload = {
  employee_id: number;
  work_date: string;
  status: AttendanceDayStatus;
  minutes_worked?: number | null;
  notes?: string | null;
};

export type CreateLeaveTypePayload = {
  name: string;
  code: string;
  paid?: boolean;
  days_per_year: number;
  requires_approval?: boolean;
};

export type UpdateLeaveTypePayload = Partial<CreateLeaveTypePayload>;

export type CreateLeaveRequestPayload = {
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  days?: number;
  reason?: string | null;
};

export type LeaveDecisionPayload = {
  review_note?: string | null;
};

export type CreateSalaryStructurePayload = {
  name: string;
  currency?: string;
};

export type UpdateSalaryStructurePayload = Partial<CreateSalaryStructurePayload>;

export type CreateCompensationPayload = {
  employee_id: number;
  structure_id?: number | null;
  basic_salary: number;
  allowances_json?: Record<string, number> | null;
  deductions_json?: Record<string, number> | null;
  effective_from: string;
};

export type CreatePayRunPayload = {
  period_start: string;
  period_end: string;
};

export type UpdatePayRunPayload = {
  period_start?: string;
  period_end?: string;
};

export type CreateOnboardingTemplatePayload = {
  name: string;
  tasks_json?: Array<{ title: string; due_offset_days?: number }> | null;
};

export type CreateOnboardingTaskPayload = {
  employee_id: number;
  template_id?: number | null;
  title: string;
  due_date?: string | null;
  status?: OnboardingTaskStatus;
};

export type UpdateOnboardingTaskPayload = Partial<Omit<CreateOnboardingTaskPayload, 'employee_id'>> & {
  completed_at?: string | null;
};

export type CreateReviewPayload = {
  employee_id: number;
  reviewer_user_id?: number | null;
  period_label: string;
  status?: ReviewStatus;
  rating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  notes?: string | null;
};

export type UpdateReviewPayload = Partial<Omit<CreateReviewPayload, 'employee_id'>>;

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

export function employeeDisplayName(employee: Pick<HrEmployee, 'first_name' | 'last_name'> | HrEmployeeRef): string {
  return `${employee.first_name} ${employee.last_name}`.trim();
}
