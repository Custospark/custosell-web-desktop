import type { ReportPeriodParams } from '../utils/periodSelectionUtils';

export type { ReportPeriodParams };

/** Statements + ratios always refetch when online (mount, focus, reconnect). */
export const financialReportQueryDefaults = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  networkMode: 'always' as const,
} as const;

export const accountingKeys = {
  all: ['accounting'] as const,
  coa: (filters?: Record<string, string>) => [...accountingKeys.all, 'chart-of-accounts', filters] as const,
  periods: () => [...accountingKeys.all, 'periods'] as const,
  journalEntries: (filters?: Record<string, string>) => [...accountingKeys.all, 'journal-entries', filters] as const,
  journalEntry: (id: number) => [...accountingKeys.all, 'journal-entries', id] as const,
  trialBalance: (params?: ReportPeriodParams) => [...accountingKeys.all, 'trial-balance', params?.cacheKey ?? 'current'] as const,
  incomeStatement: (params?: ReportPeriodParams) => [...accountingKeys.all, 'income-statement', params?.cacheKey ?? 'current'] as const,
  balanceSheet: (params?: ReportPeriodParams) => [...accountingKeys.all, 'balance-sheet', params?.cacheKey ?? 'current'] as const,
  ratios: (params?: ReportPeriodParams) => [...accountingKeys.all, 'ratios', params?.cacheKey ?? 'current'] as const,
  fixedAssets: (filters?: Record<string, string>) =>
    (filters
      ? ([...accountingKeys.all, 'fixed-assets', filters] as const)
      : ([...accountingKeys.all, 'fixed-assets'] as const)),
  fixedAsset: (id: number) => [...accountingKeys.all, 'fixed-assets', 'detail', id] as const,
  fixedAssetSchedule: (id: number) => [...accountingKeys.all, 'fixed-assets', 'detail', id, 'schedule'] as const,
  cashFlow: (params?: ReportPeriodParams) => [...accountingKeys.all, 'cash-flow', params?.cacheKey ?? 'current'] as const,
  equity: (params?: ReportPeriodParams) => [...accountingKeys.all, 'equity', params?.cacheKey ?? 'current'] as const,
  inventoryReconciliation: () => [...accountingKeys.all, 'inventory-reconciliation'] as const,
};
