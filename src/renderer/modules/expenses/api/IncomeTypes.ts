export interface IncomeAttachment {
  id: number;
  income_source_id: number;
  user_id: number | null;
  type: 'file' | 'link';
  file_name: string;
  file_path: string | null;
  file_url: string | null;
  link_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | null;
}

export interface IncomeSource {
  id: number;
  business_id: number;
  user_id: number | null;
  amount: string;
  source_name: string;
  description: string | null;
  income_date: string;
  attachments?: IncomeAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CreateIncomeData {
  amount: number;
  source_name: string;
  description?: string | null;
  income_date: string;
}

export type UpdateIncomeData = Partial<CreateIncomeData>;

export interface IncomeSummary {
  total_amount: number;
  total_count: number;
  by_source: {
    source: string;
    total: number;
    count: number;
  }[];
}

export interface BudgetPeriod {
  start: string;
  end: string;
  days_remaining: number;
  label: string;
}

export interface BudgetCategory {
  id: number;
  name: string;
  budget: number;
  actual: number;
  remaining: number;
  percentage: number;
}

export interface BudgetData {
  period: BudgetPeriod;
  income_target: number;
  income_actual: number;
  expense_budget: number;
  expense_actual: number;
  net_target: number;
  net_actual: number;
  daily_remaining: number;
  categories: BudgetCategory[];
}

export interface OverviewData {
  account_type?: 'personal' | 'business';
  total_income: number;
  total_expenses: number;
  net_balance: number;
  income_count: number;
  expense_count: number;
  income_by_source: { source: string; total: number; count: number }[];
  expenses_by_category: { category_id: number | null; category_name: string; total: number; count: number }[];
  monthly_trends: { month: string; income: number; expenses: number }[];
  daily_spending_trends: { day: number; label: string; expenses: number }[];
  monthly_spending_trends: { month: number; label: string; expenses: number }[];
  recent_transactions: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    id: number;
  }[];
}
