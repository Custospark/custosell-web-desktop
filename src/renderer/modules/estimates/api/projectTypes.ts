export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type AllocationType = 'labor' | 'material' | 'overhead' | 'expense' | 'other';
export type AllocationBasis = 'fixed' | 'percent' | 'hours';

export interface ProjectUserRef {
  id: number;
  name: string;
}

export interface ProjectCustomerRef {
  id: number;
  name: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  status: ProjectTaskStatus;
  sort_order: number;
  estimated_hours: number;
  actual_hours: number;
  budget_cost: number;
  due_date: string | null;
  assigned_to: number | null;
  assignee?: ProjectUserRef | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetEntry {
  id: number;
  business_id: number;
  project_id: number;
  project_task_id: number | null;
  user_id: number;
  entry_date: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  notes: string | null;
  is_billable: boolean;
  status: TimesheetStatus;
  created_by: number;
  user?: ProjectUserRef;
  task?: Pick<ProjectTask, 'id' | 'name'> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCostAllocation {
  id: number;
  business_id: number;
  project_id: number;
  allocation_type: AllocationType;
  description: string;
  amount: number;
  basis: AllocationBasis;
  basis_value: number;
  allocation_date: string;
  expense_id: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type ProjectMemberRole = 'viewer' | 'contributor' | 'manager';

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectMemberRole;
  user?: ProjectUserRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  business_id: number;
  customer_id: number | null;
  estimate_id: number | null;
  pipeline_lead_id: number | null;
  project_number: string;
  name: string;
  status: ProjectStatus;
  currency: string;
  budget_revenue?: number;
  budget_cost?: number;
  actual_cost?: number;
  actual_revenue?: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  description: string | null;
  manager_id: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  customer?: ProjectCustomerRef | null;
  manager?: ProjectUserRef | null;
  tasks?: ProjectTask[];
  timesheet_entries?: TimesheetEntry[];
  cost_allocations?: ProjectCostAllocation[];
  members?: ProjectMember[];
}

export interface ProjectBudgetSummary {
  project_id: number;
  budget_revenue: number;
  budget_cost: number;
  actual_cost: number;
  actual_revenue: number;
  cost_variance: number;
  revenue_variance: number;
  margin_budget: number;
  margin_actual: number;
  margin_percent_budget: number;
  margin_percent_actual: number;
  labor_cost: number;
  material_cost: number;
  overhead_cost: number;
  other_cost: number;
}

export interface ProjectProfitability {
  project_id: number;
  revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_percent: number;
  billable_hours: number;
  non_billable_hours: number;
}

export type CreateProjectPayload = {
  customer_id?: number | null;
  estimate_id?: number | null;
  pipeline_lead_id?: number | null;
  name: string;
  status?: ProjectStatus;
  currency?: string;
  budget_revenue?: number;
  budget_cost?: number;
  start_date?: string | null;
  due_date?: string | null;
  description?: string | null;
  manager_id?: number | null;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export type CreateProjectTaskPayload = {
  name: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  estimated_hours?: number;
  budget_cost?: number;
  due_date?: string | null;
  assigned_to?: number | null;
  sort_order?: number;
};

export type CreateTimesheetEntryPayload = {
  project_task_id?: number | null;
  user_id: number;
  entry_date: string;
  hours: number;
  hourly_rate?: number;
  notes?: string | null;
  is_billable?: boolean;
};

export type CreateCostAllocationPayload = {
  allocation_type: AllocationType;
  description: string;
  amount: number;
  basis?: AllocationBasis;
  basis_value?: number;
  allocation_date: string;
  expense_id?: number | null;
};
