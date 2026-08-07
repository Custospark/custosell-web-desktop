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

export interface CreateBudgetData {
  name: string;
  description?: string | null;
  planned_amount: number;
  period_start?: string | null;
  period_end?: string | null;
  status?: 'active' | 'archived';
}

export type UpdateBudgetData = Partial<CreateBudgetData>;

export interface BudgetLine {
  id: number;
  personal_budget_id: number;
  item_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  purchased: boolean;
  expense_id: number | null;
  expense?: { id: number; amount: string | number; description: string; expense_date: string } | null;
}

export interface BudgetDetailSummary {
  planned: number;
  actual_spend: number;
  actual_income: number;
  remaining: number;
  percentage: number;
}

export interface BudgetDetail {
  data: PersonalBudget;
  lines: BudgetLine[];
  expenses: { id: number; amount: string; description: string; expense_date: string }[];
  income: { id: number; amount: string; source_name: string; income_date: string }[];
  summary: BudgetDetailSummary;
}

export interface Affordability {
  income_available: number;
  plan_remaining: number;
  can_handle: boolean;
  recommendation: string;
}

export interface BudgetAlert {
  level: 'near' | 'over';
  budget_id: number | null;
  name: string;
  message: string;
  remaining: number;
}

export interface MoneySummary {
  income: number;
  expense: number;
  savings: number;
  planned_total: number;
  spent_in_budgets: number;
  budget_count: number;
  affordable: boolean;
  recommendation: string;
}