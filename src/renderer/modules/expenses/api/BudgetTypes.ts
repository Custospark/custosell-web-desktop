export interface PersonalBudget {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  planned_amount: number;
  period_start: string | null;
  period_end: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PersonalBudgetSummaryRow {
  id: number;
  name: string;
  description: string | null;
  planned_amount: number;
  period_start: string | null;
  period_end: string | null;
  status: 'active' | 'archived';
  actual_income: number;
  actual_spend: number;
  remaining: number;
  percentage: number;
  expense_count: number;
  income_count: number;
  pacing: { label: string; budget: number; actual: number }[];
}

export interface PersonalBudgetSummaries {
  budgets: PersonalBudgetSummaryRow[];
  total_planned: number;
  total_spend: number;
  total_income: number;
}

export interface CreateBudgetData {
  name: string;
  description?: string | null;
  planned_amount: number;
  period_start?: string | null;
  period_end?: string | null;
  status?: 'active' | 'archived';
}

export type UpdateBudgetData = Partial<CreateBudgetData>;