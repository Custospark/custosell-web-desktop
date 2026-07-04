export interface AccountType {
  id: number;
  name: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  normal_balance: 'debit' | 'credit';
}

export interface ChartOfAccount {
  id: number;
  business_id: number;
  code: string;
  name: string;
  parent_id: number | null;
  type_id: number;
  account_type?: AccountType;
  normal_balance: 'debit' | 'credit';
  is_active: boolean;
  is_system?: boolean;
  children?: ChartOfAccount[];
  created_at: string;
  updated_at: string;
}

export interface AccountingPeriod {
  id: number;
  business_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_by: number | null;
  closed_at: string | null;
}

export interface JournalEntryLine {
  id?: number;
  entry_id?: number;
  account_id: number;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
}

export interface JournalEntry {
  id: number;
  business_id: number;
  entry_number: string;
  date: string;
  description: string;
  reference_type: string;
  reference_id: number | null;
  period_id: number;
  created_by: number;
  locked: boolean;
  posted_at: string | null;
  lines: JournalEntryLine[];
  attachment_url?: string | null;
  created_at: string;
}

export interface TrialBalanceAccount {
  account_id: number;
  code: string;
  name: string;
  type: string;
  debit_balance: number;
  credit_balance: number;
}

export interface TrialBalance {
  period: AccountingPeriod;
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  accounts: TrialBalanceAccount[];
}

export interface IncomeStatement {
  period: AccountingPeriod;
  total_revenue: number;
  total_cost_of_goods_sold: number;
  gross_profit: number;
  total_operating_expenses: number;
  operating_income: number;
  other_income: number;
  other_expenses: number;
  net_income_before_tax: number;
  tax_expense: number;
  net_income: number;
  sections: Record<string, { account_id: number; code: string; name: string; balance: number }[]>;
}

export interface BalanceSheet {
  period: AccountingPeriod;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
  sections: Record<string, { account_id: number; code: string; name: string; balance: number }[]>;
}

export interface Recommendation {
  category: string;
  ratio_key: string;
  label: string;
  status: 'healthy' | 'warning' | 'danger';
  value: number | null;
  message: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RatioSet {
  liquidity: {
    current_ratio: number | null;
    quick_ratio: number | null;
    cash_ratio: number | null;
  };
  solvency: {
    debt_to_equity: number | null;
    debt_ratio: number | null;
    interest_coverage_ratio: number | null;
  };
  efficiency: {
    asset_turnover: number | null;
    inventory_turnover: number | null;
    accounts_receivable_turnover: number | null;
  };
  profitability: {
    gross_profit_margin: number | null;
    net_profit_margin: number | null;
    return_on_assets: number | null;
    return_on_equity: number | null;
  };
  recommendations: Recommendation[];
}

export interface RatioTrendItem {
  period_id: number;
  period_name: string;
  ratios: RatioSet;
}

export interface FixedAsset {
  id: number;
  business_id: number;
  account_id: number;
  name: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  purchase_date: string;
  book_value: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  notes: string | null;
  monthly_depreciation?: number;
}

export interface DepreciationEntry {
  id: number;
  asset_id: number;
  period_id: number;
  amount: number;
  accumulated_depreciation: number;
  book_value_after: number;
}
