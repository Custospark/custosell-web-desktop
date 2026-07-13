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
