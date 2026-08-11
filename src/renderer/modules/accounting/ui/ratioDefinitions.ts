import type { RatioSet } from '../api/AccountingTypes';
import type { HealthStatus, RatioDef, RatioFormat } from './ratioTypes';

export const RATIO_DEFS: RatioDef[] = [
  { category: 'liquidity', key: 'current_ratio', label: 'Current Ratio', format: 'decimal', healthyThreshold: 2, warningThreshold: 1, higherIsBetter: true },
  { category: 'liquidity', key: 'quick_ratio', label: 'Quick Ratio', format: 'decimal', healthyThreshold: 1, warningThreshold: 0.5, higherIsBetter: true },
  { category: 'liquidity', key: 'cash_ratio', label: 'Cash Ratio', format: 'decimal', healthyThreshold: 0.5, warningThreshold: 0.3, higherIsBetter: true },
  { category: 'profitability', key: 'gross_profit_margin', label: 'Gross Margin', format: 'percent', healthyThreshold: 40, warningThreshold: 20, higherIsBetter: true },
  { category: 'profitability', key: 'net_profit_margin', label: 'Net Margin', format: 'percent', healthyThreshold: 15, warningThreshold: 5, higherIsBetter: true },
  { category: 'profitability', key: 'return_on_assets', label: 'ROA', format: 'percent', healthyThreshold: 10, warningThreshold: 5, higherIsBetter: true },
  { category: 'profitability', key: 'return_on_equity', label: 'ROE', format: 'percent', healthyThreshold: 15, warningThreshold: 10, higherIsBetter: true },
  { category: 'solvency', key: 'debt_to_equity', label: 'D/E', format: 'decimal', healthyThreshold: 1, warningThreshold: 2, higherIsBetter: false },
  { category: 'solvency', key: 'debt_ratio', label: 'D/A', format: 'decimal', healthyThreshold: 0.5, warningThreshold: 0.7, higherIsBetter: false },
  { category: 'solvency', key: 'interest_coverage_ratio', label: 'ICR', format: 'times', healthyThreshold: 3, warningThreshold: 1.5, higherIsBetter: true },
  { category: 'efficiency', key: 'asset_turnover', label: 'Asset T/O', format: 'times', healthyThreshold: 1.5, warningThreshold: 0.8, higherIsBetter: true },
  { category: 'efficiency', key: 'inventory_turnover', label: 'Inv T/O', format: 'times', healthyThreshold: 6, warningThreshold: 3, higherIsBetter: true },
  { category: 'efficiency', key: 'accounts_receivable_turnover', label: 'AR T/O', format: 'times', healthyThreshold: 8, warningThreshold: 4, higherIsBetter: true },
];

export const RATIO_INFO: Record<string, { fullName: string; meaning: string; formula: string; importance: string }> = {
  current_ratio: {
    fullName: 'Current Ratio',
    meaning: 'Measures your ability to pay short-term obligations with short-term assets.',
    formula: 'Current Assets ÷ Current Liabilities',
    importance: 'A ratio below 1.0 means liabilities exceed assets — risk of insolvency. Above 2.0 is healthy.',
  },
  quick_ratio: {
    fullName: 'Quick Ratio (Acid Test)',
    meaning: 'Like the current ratio but excludes inventory. Tests immediate liquidity.',
    formula: '(Current Assets − Inventory) ÷ Current Liabilities',
    importance: 'Above 1.0 means you can pay debts without selling inventory.',
  },
  cash_ratio: {
    fullName: 'Cash Ratio',
    meaning: 'The most conservative liquidity measure — only cash and equivalents.',
    formula: '(Cash + Bank) ÷ Current Liabilities',
    importance: 'Above 0.5 means you have emergency cash reserves.',
  },
  gross_profit_margin: {
    fullName: 'Gross Profit Margin',
    meaning: 'Percentage of revenue retained after paying for products/services sold.',
    formula: '(Revenue − COGS) ÷ Revenue × 100',
    importance: 'Shows pricing power and cost efficiency. Below 20% means costs consume most of your revenue.',
  },
  net_profit_margin: {
    fullName: 'Net Profit Margin',
    meaning: 'Percentage of revenue that becomes profit after ALL expenses.',
    formula: 'Net Income ÷ Revenue × 100',
    importance: 'The bottom line. Above 15% is excellent.',
  },
  return_on_assets: {
    fullName: 'Return on Assets (ROA)',
    meaning: 'How efficiently your assets generate profit.',
    formula: 'Net Income ÷ Total Assets × 100',
    importance: 'Measures management effectiveness. Below 5% suggests assets are underperforming.',
  },
  return_on_equity: {
    fullName: 'Return on Equity (ROE)',
    meaning: 'Return generated on shareholders\' invested capital.',
    formula: 'Net Income ÷ Shareholders\' Equity × 100',
    importance: 'Above 15% is excellent. Below 10% may not justify the risk of owning the business.',
  },
  debt_to_equity: {
    fullName: 'Debt-to-Equity Ratio (D/E)',
    meaning: 'How much debt vs equity the business uses to finance operations.',
    formula: 'Total Liabilities ÷ Shareholders\' Equity',
    importance: 'Above 2.0 means heavy debt reliance — higher risk in downturns. Below 1.0 is conservative.',
  },
  debt_ratio: {
    fullName: 'Debt Ratio (D/A)',
    meaning: 'Proportion of assets financed by debt.',
    formula: 'Total Liabilities ÷ Total Assets',
    importance: 'Above 0.5 means creditors own more than half the assets.',
  },
  interest_coverage_ratio: {
    fullName: 'Interest Coverage Ratio (ICR)',
    meaning: 'How many times operating profit can cover interest payments.',
    formula: 'Operating Income ÷ Interest Expense',
    importance: 'Below 1.5 means you risk defaulting on debt. Above 3.0 is comfortable.',
  },
  asset_turnover: {
    fullName: 'Asset Turnover Ratio',
    meaning: 'How efficiently assets generate sales revenue.',
    formula: 'Sales ÷ Total Assets',
    importance: 'Below 0.8 means assets are underutilized. Above 1.5 indicates strong efficiency.',
  },
  inventory_turnover: {
    fullName: 'Inventory Turnover Ratio',
    meaning: 'How many times inventory is sold and replaced in a period.',
    formula: 'COGS ÷ Average Inventory',
    importance: 'Below 3x signals excess inventory tying up cash. Above 6x is healthy.',
  },
  accounts_receivable_turnover: {
    fullName: 'Accounts Receivable Turnover (AR T/O)',
    meaning: 'How quickly customers pay their debts.',
    formula: 'Net Sales ÷ Average Accounts Receivable',
    importance: 'Below 4x means slow collections straining cash flow.',
  },
};

export function getHealth(value: number | null, def: RatioDef): HealthStatus {
  if (value === null || value === undefined) return 'danger';
  if (def.higherIsBetter) {
    if (value >= def.healthyThreshold) return 'healthy';
    if (value >= def.warningThreshold) return 'warning';
    return 'danger';
  }
  if (value <= def.healthyThreshold) return 'healthy';
  if (value <= def.warningThreshold) return 'warning';
  return 'danger';
}

export function getRatioValue(ratios: RatioSet | undefined, category: keyof RatioSet, key: string): number | null {
  if (!ratios) return null;
  const cat = ratios[category];
  if (!cat) return null;
  return (cat as Record<string, number | null>)[key] ?? null;
}

export function formatRatioValue(value: number, format: RatioFormat): string {
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (format === 'times') return `${value.toFixed(1)}x`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
