export type ForecastCoverageStatus = 'healthy' | 'tight' | 'critical' | 'unknown';
export type ForecastBudgetStatus = 'draft' | 'active' | 'archived';
export type ForecastZbbStatus = 'draft' | 'justified' | 'approved';
export type ForecastKpiMode = 'auto' | 'retail' | 'saas';
export type ForecastBvaStatus = 'over' | 'under' | 'on_track';

export interface ForecastPeriodMeta {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export interface ForecastCashBlock {
  cash_1101: number;
  bank_1102: number;
  cash_available: number;
}

export interface ForecastLiabilitiesBlock {
  salaries_payable_2110: number;
  paye_payable_2111: number;
  nssf_payable_2112: number;
  unpaid_payroll_liabilities: number;
}

export interface ForecastPayrollBurn {
  employee_count?: number;
  employees_missing_compensation?: number;
  gross?: number;
  paye?: number;
  nssf_employee?: number;
  nssf_employer?: number;
  other_deductions?: number;
  net?: number;
  monthly_employer_cash_cost?: number;
  monthly_burn: number;
}

export interface ForecastBurnBlock {
  payroll: ForecastPayrollBurn;
  monthly_payroll_burn: number;
  incremental_hire_burn: number;
  monthly_opex: number;
  trailing_30d_opex: number;
  extra_monthly_opex: number;
  monthly_total_burn: number;
}

export interface ForecastInflowsBlock {
  trailing_30d_net_sales: number;
  assumed_monthly_inflow: number;
  revenue_uplift_pct: number;
}

export interface ForecastCoverage {
  cash_after_arrears: number;
  runway_months: number | null;
  runway_months_floor: number;
  can_clear_arrears: boolean;
  status: ForecastCoverageStatus;
}

export interface ForecastMonthRow {
  offset: number;
  label: string;
  month_start: string;
  opening_cash: number;
  inflows: number;
  payroll_outflow: number;
  opex_outflow: number;
  liability_clear: number;
  net_change: number;
  closing_cash: number;
  cash_available: number;
  surplus_deficit: number;
  can_cover: boolean;
}

export interface CashForecast {
  as_of_date: string;
  horizon_months: number;
  period: ForecastPeriodMeta | null;
  cash: ForecastCashBlock;
  liabilities: ForecastLiabilitiesBlock;
  burn: ForecastBurnBlock;
  inflows: ForecastInflowsBlock;
  coverage: ForecastCoverage;
  months: ForecastMonthRow[];
  hire_scenario?: unknown;
  assumptions: string[];
  warnings: string[];
}

export interface BudgetVsActualCategoryRow {
  expense_category_id: number;
  name: string;
  slug: string | null;
  budget_period: string | null;
  raw_budget_amount: number | null;
  budget: number;
  actual: number;
  variance: number;
  variance_pct: number | null;
  status: ForecastBvaStatus;
}

export interface BudgetVsActual {
  period: ForecastPeriodMeta | null;
  start_date: string;
  end_date: string;
  categories: BudgetVsActualCategoryRow[];
  totals: {
    budget: number;
    actual: number;
    variance: number;
    variance_pct: number | null;
  };
  assumptions: string[];
  warnings: string[];
}

export interface ForecastingOverview {
  cash_forecast: CashForecast;
  budget_vs_actual: BudgetVsActual;
  assumptions: string[];
  warnings: string[];
}

export interface ForecastBudgetLine {
  id: number;
  forecast_budget_id: number;
  business_id: number;
  expense_category_id: number | null;
  label: string;
  amount: number;
  justification: string | null;
  zbb_status: ForecastZbbStatus;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ForecastBudget {
  id: number;
  business_id: number;
  year: number;
  name: string;
  status: ForecastBudgetStatus;
  lines: ForecastBudgetLine[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ForecastSnapshot {
  id: number;
  business_id: number;
  forecast_budget_id: number | null;
  label: string;
  as_of_date: string;
  payload_json: Record<string, unknown> | null;
  created_by: number | null;
  created_at?: string | null;
  assumptions?: string[];
  warnings?: string[];
}

export interface ForecastRetailKpis {
  pulse_30d_net_sales: number;
  cac: number | null;
  acquisition_spend_30d: number;
  new_customers_30d: number;
  ltv: number;
  churn_pct_90d: number;
  customers_with_purchases: number;
  churned_customers: number;
}

export interface ForecastSaasKpis {
  recurring_product_count: number;
  avg_recurring_price: number;
  active_subscribers_60d: number;
  mrr: number;
  arr: number;
}

export interface ForecastKpis {
  as_of_date: string;
  mode: ForecastKpiMode;
  resolved_mode: 'retail' | 'saas';
  has_recurring_products: boolean;
  retail: ForecastRetailKpis;
  saas: ForecastSaasKpis | null;
  burn: {
    monthly_payroll_burn: number | null;
    monthly_opex: number | null;
    monthly_total_burn: number | null;
    coverage: ForecastCoverage | null;
  };
  assumptions: string[];
  warnings: string[];
}

export interface ForecastScenario {
  id: number;
  business_id: number;
  name: string;
  horizon_months: number;
  hire_basic_salary: number | null;
  extra_monthly_opex: number;
  revenue_uplift_pct: number;
  payload_json: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ForecastScenarioRun {
  scenario: ForecastScenario;
  baseline: CashForecast;
  scenario_forecast: CashForecast;
  delta: {
    monthly_total_burn: number;
    assumed_monthly_inflow: number;
    closing_cash_last_month: number;
  };
  assumptions: string[];
  warnings: string[];
}

export type OverviewParams = {
  as_of_date?: string | null;
  horizon_months?: number;
  period_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type CashForecastParams = {
  as_of_date?: string | null;
  horizon_months?: number;
  period_id?: number | null;
};

export type BudgetVsActualParams = {
  period_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type KpiParams = {
  mode?: ForecastKpiMode;
  as_of_date?: string | null;
};

export type CreateBudgetPayload = {
  year: number;
  name: string;
  status?: ForecastBudgetStatus;
};

export type UpdateBudgetPayload = Partial<CreateBudgetPayload>;

export type CreateBudgetLinePayload = {
  expense_category_id?: number | null;
  label: string;
  amount?: number;
  justification?: string | null;
  zbb_status?: ForecastZbbStatus;
  sort_order?: number;
};

export type UpdateBudgetLinePayload = Partial<CreateBudgetLinePayload>;

export type JustifyLinePayload = {
  justification: string;
};

export type RollBudgetPayload = {
  label?: string | null;
  as_of_date?: string | null;
};

export type CreateScenarioPayload = {
  name: string;
  horizon_months?: number;
  hire_basic_salary?: number | null;
  extra_monthly_opex?: number;
  revenue_uplift_pct?: number;
  payload_json?: Record<string, unknown> | null;
};

export type UpdateScenarioPayload = Partial<CreateScenarioPayload>;

export type RunScenarioPayload = {
  as_of_date?: string | null;
  period_id?: number | null;
};
