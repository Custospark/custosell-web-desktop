import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { imperativeToast } from '../../../app/contexts/imperativeToast';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import { apiErrorMessage } from '../../../shared/utils/apiErrorMessage';
import type {
  TrialBalance, IncomeStatement, BalanceSheet, RatioSet, RatioTrendItem,
  CashFlowStatement, EquityStatement, InventoryReconciliation,
} from './AccountingTypes';
import type { ReportPeriodParams } from '../utils/periodSelectionUtils';
import { buildReportQueryString } from '../utils/periodSelectionUtils';
import { accountingKeys, financialReportQueryDefaults } from './accountingQueryKeys';

const REPORT_ERROR_FALLBACK = 'Failed to load financial report';

/**
 * Report pages fire several queries at once (trial balance, P&L, balance sheet,
 * cash flow, equity) - the same failing request would otherwise toast repeatedly.
 * Only the first occurrence of a message surfaces.
 */
const recentErrors = new Map<string, number>();

function shouldToast(message: string): boolean {
  const now = Date.now();
  const last = recentErrors.get(message);
  if (last && now - last < 5000) return false;
  recentErrors.set(message, now);
  return true;
}

function reportOnError(err: unknown): void {
  const message = apiErrorMessage(err, REPORT_ERROR_FALLBACK);
  if (shouldToast(message)) imperativeToast.show('error', message, 8000);
}

function useReportQuery<T>(options: UseQueryOptions<T, Error>) {
  return useQuery<T>({
    ...options,
    onError: reportOnError,
  });
}

export function useTrialBalance(reportParams?: ReportPeriodParams) {
  return useReportQuery<TrialBalance>({
    queryKey: accountingKeys.trialBalance(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: TrialBalance }>(`${ACCOUNTING.TRIAL_BALANCE}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}
export function useIncomeStatement(reportParams?: ReportPeriodParams) {
  return useReportQuery<IncomeStatement>({
    queryKey: accountingKeys.incomeStatement(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: IncomeStatement }>(`${ACCOUNTING.INCOME_STATEMENT}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}

export function useBalanceSheet(reportParams?: ReportPeriodParams) {
  return useReportQuery<BalanceSheet>({
    queryKey: accountingKeys.balanceSheet(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: BalanceSheet }>(`${ACCOUNTING.BALANCE_SHEET}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}

export function useRatios(reportParams?: ReportPeriodParams) {
  return useReportQuery<RatioSet>({
    queryKey: accountingKeys.ratios(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: RatioSet }>(`${ACCOUNTING.RATIOS}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}

export function useRatioTrends(interval = 'monthly', count = 12) {
  return useReportQuery<RatioTrendItem[]>({
    queryKey: [...accountingKeys.ratios(), 'trends', interval, count],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: RatioTrendItem[] }>(
        `${ACCOUNTING.RATIO_TRENDS}?interval=${interval}&count=${count}`
      );
      return data.data ?? [];
    },
    ...financialReportQueryDefaults,
    retry: 1,
  });
}

export function useCashFlow(reportParams?: ReportPeriodParams) {
  return useReportQuery<CashFlowStatement>({
    queryKey: accountingKeys.cashFlow(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: CashFlowStatement }>(`${ACCOUNTING.CASH_FLOW}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}

export function useEquity(reportParams?: ReportPeriodParams) {
  return useReportQuery<EquityStatement>({
    queryKey: accountingKeys.equity(reportParams),
    queryFn: async () => {
      const params = buildReportQueryString(reportParams);
      const { data } = await axiosInstance.get<{ data: EquityStatement }>(`${ACCOUNTING.EQUITY}${params}`);
      return data.data;
    },
    ...financialReportQueryDefaults,
  });
}

export function useInventoryReconciliation() {
  return useReportQuery<InventoryReconciliation>({
    queryKey: accountingKeys.inventoryReconciliation(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: InventoryReconciliation }>(ACCOUNTING.INVENTORY_RECONCILIATION);
      return data.data;
    },
  });
}

export function usePostOpeningInventory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<{ entry_number: string; gl_inventory_balance: number; adjustment_posted: number }, AxiosError, { force?: boolean }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: { entry_number: string; gl_inventory_balance: number; adjustment_posted: number } }>(
        ACCOUNTING.INVENTORY_OPENING_BALANCE,
        payload,
      );
      return data.data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: accountingKeys.all });
      showToast('success', `Opening inventory posted (${result.entry_number})`);
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to post opening inventory';
      showToast('error', msg);
    },
  });
}
