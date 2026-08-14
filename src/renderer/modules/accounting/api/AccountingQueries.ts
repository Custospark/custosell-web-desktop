// Barrel re-export for accounting query hooks. Split into focused modules to
// keep each file under the 500-line Vera limit - imports here stay unchanged.
export {
  accountingKeys,
  financialReportQueryDefaults,
} from './accountingQueryKeys';
export type { ReportPeriodParams } from './accountingQueryKeys';
export {
  useAccountingPeriods,
  useChartOfAccounts,
  useChartOfAccountsTree,
  useClosePeriod,
  useCreateChartOfAccount,
  useCurrentPeriod,
  useDeleteChartOfAccount,
  useUpdateChartOfAccount,
} from './accountingCoaQueries';
export {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from './accountingJournalQueries';
export {
  useBalanceSheet,
  useCashFlow,
  useEquity,
  useIncomeStatement,
  useInventoryReconciliation,
  usePostOpeningInventory,
  useRatioTrends,
  useRatios,
  useTrialBalance,
} from './accountingReportQueries';
export {
  useCreateFixedAsset,
  useFixedAsset,
  useFixedAssetSchedule,
  useFixedAssets,
  useRunDepreciation,
  useUpdateFixedAsset,
} from './accountingFixedAssetQueries';
