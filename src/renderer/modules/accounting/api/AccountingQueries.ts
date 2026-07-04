import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import type {
  ChartOfAccount, AccountingPeriod, JournalEntry, JournalEntryLine,
  TrialBalance, IncomeStatement, BalanceSheet, RatioSet, RatioTrendItem, FixedAsset,
} from './AccountingTypes';

export const accountingKeys = {
  all: ['accounting'] as const,
  coa: (filters?: Record<string, string>) => [...accountingKeys.all, 'chart-of-accounts', filters] as const,
  periods: () => [...accountingKeys.all, 'periods'] as const,
  journalEntries: (filters?: Record<string, string>) => [...accountingKeys.all, 'journal-entries', filters] as const,
  journalEntry: (id: number) => [...accountingKeys.all, 'journal-entries', id] as const,
  trialBalance: (periodId?: number) => [...accountingKeys.all, 'trial-balance', periodId] as const,
  incomeStatement: (periodId?: number) => [...accountingKeys.all, 'income-statement', periodId] as const,
  balanceSheet: (periodId?: number) => [...accountingKeys.all, 'balance-sheet', periodId] as const,
  ratios: (periodId?: number) => [...accountingKeys.all, 'ratios', periodId] as const,
  fixedAssets: (filters?: Record<string, string>) => [...accountingKeys.all, 'fixed-assets', filters] as const,
};

export function useChartOfAccounts(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<ChartOfAccount[]>({
    queryKey: accountingKeys.coa(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: ChartOfAccount[] }>(`${ACCOUNTING.COA}${params ? `?${params}` : ''}`);
      return data.data ?? [];
    },
  });
}

export function useChartOfAccountsTree() {
  return useQuery<ChartOfAccount[]>({
    queryKey: accountingKeys.coa({ tree: '1' }),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: ChartOfAccount[] }>(ACCOUNTING.COA_TREE);
      return data.data ?? [];
    },
  });
}

export function useAccountingPeriods() {
  return useQuery<AccountingPeriod[]>({
    queryKey: accountingKeys.periods(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: AccountingPeriod[] }>(ACCOUNTING.PERIODS);
      return data.data ?? [];
    },
  });
}

export function useCurrentPeriod() {
  return useQuery<AccountingPeriod>({
    queryKey: [...accountingKeys.periods(), 'current'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: AccountingPeriod }>(ACCOUNTING.CURRENT_PERIOD);
      return data.data;
    },
  });
}

export function useJournalEntries(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<JournalEntry[]>({
    queryKey: accountingKeys.journalEntries(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: JournalEntry[] }>(`${ACCOUNTING.JOURNAL_ENTRIES}${params ? `?${params}` : ''}`);
      return data.data ?? [];
    },
  });
}

export function useJournalEntry(id: number) {
  return useQuery<JournalEntry>({
    queryKey: accountingKeys.journalEntry(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: JournalEntry }>(ACCOUNTING.journalEntry(id));
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useTrialBalance(periodId?: number) {
  return useQuery<TrialBalance>({
    queryKey: accountingKeys.trialBalance(periodId),
    queryFn: async () => {
      const params = periodId ? `?period_id=${periodId}` : '';
      const { data } = await axiosInstance.get<{ data: TrialBalance }>(`${ACCOUNTING.TRIAL_BALANCE}${params}`);
      return data.data;
    },
  });
}

export function useIncomeStatement(periodId?: number) {
  return useQuery<IncomeStatement>({
    queryKey: accountingKeys.incomeStatement(periodId),
    queryFn: async () => {
      const params = periodId ? `?period_id=${periodId}` : '';
      const { data } = await axiosInstance.get<{ data: IncomeStatement }>(`${ACCOUNTING.INCOME_STATEMENT}${params}`);
      return data.data;
    },
  });
}

export function useBalanceSheet(periodId?: number) {
  return useQuery<BalanceSheet>({
    queryKey: accountingKeys.balanceSheet(periodId),
    queryFn: async () => {
      const params = periodId ? `?period_id=${periodId}` : '';
      const { data } = await axiosInstance.get<{ data: BalanceSheet }>(`${ACCOUNTING.BALANCE_SHEET}${params}`);
      return data.data;
    },
  });
}

export function useRatios(periodId?: number) {
  return useQuery<RatioSet>({
    queryKey: accountingKeys.ratios(periodId),
    queryFn: async () => {
      const params = periodId ? `?period_id=${periodId}` : '';
      const { data } = await axiosInstance.get<{ data: RatioSet }>(`${ACCOUNTING.RATIOS}${params}`);
      return data.data;
    },
  });
}

export function useRatioTrends(interval = 'monthly', count = 12) {
  return useQuery<RatioTrendItem[]>({
    queryKey: [...accountingKeys.ratios(), 'trends', interval, count],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: RatioTrendItem[] }>(
        `${ACCOUNTING.RATIO_TRENDS}?interval=${interval}&count=${count}`
      );
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
}

export function useFixedAssets(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<FixedAsset[]>({
    queryKey: accountingKeys.fixedAssets(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: FixedAsset[] }>(`${ACCOUNTING.FIXED_ASSETS}${params ? `?${params}` : ''}`);
      return data.data ?? [];
    },
  });
}

export function useCreateChartOfAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ChartOfAccount, AxiosError, Partial<ChartOfAccount>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: ChartOfAccount }>(ACCOUNTING.COA, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.coa() });
      showToast('success', 'Chart of account created');
    },
    onError: () => showToast('error', 'Failed to create account'),
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<JournalEntry, AxiosError, { date: string; description: string; lines: JournalEntryLine[]; attachment?: File | null }>({
    mutationFn: async (payload) => {
      let response;
      if (payload.attachment) {
        const fd = new FormData();
        fd.append('date', payload.date);
        fd.append('description', payload.description);
        fd.append('attachment', payload.attachment);
        payload.lines.forEach((line, i) => {
          fd.append(`lines[${i}][account_id]`, String(line.account_id));
          fd.append(`lines[${i}][debit_amount]`, String(line.debit_amount));
          fd.append(`lines[${i}][credit_amount]`, String(line.credit_amount));
          if (line.description) fd.append(`lines[${i}][description]`, line.description);
        });
        response = await axiosInstance.post<{ data: JournalEntry }>(ACCOUNTING.JOURNAL_ENTRIES, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axiosInstance.post<{ data: JournalEntry }>(ACCOUNTING.JOURNAL_ENTRIES, payload);
      }
      return response.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.journalEntries() });
      showToast('success', 'Journal entry created');
    },
    onError: () => showToast('error', 'Failed to create journal entry'),
  });
}

export function usePostJournalEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<JournalEntry, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post<{ data: JournalEntry }>(ACCOUNTING.postJournalEntry(id));
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.all });
      showToast('success', 'Journal entry posted');
    },
    onError: () => showToast('error', 'Failed to post journal entry'),
  });
}

export function useUpdateChartOfAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ChartOfAccount, AxiosError, { id: number; data: Partial<ChartOfAccount> }>({
    mutationFn: async ({ id, data }) => {
      const res = await axiosInstance.put<{ data: ChartOfAccount }>(ACCOUNTING.COA_ITEM(id), data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.coa() });
      showToast('success', 'Account updated');
    },
    onError: () => showToast('error', 'Failed to update account'),
  });
}

export function useDeleteChartOfAccount() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(ACCOUNTING.COA_ITEM(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.coa() });
      showToast('success', 'Account deactivated');
    },
    onError: () => showToast('error', 'Failed to delete account'),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(ACCOUNTING.journalEntry(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.journalEntries() });
      showToast('success', 'Journal entry deleted');
    },
    onError: () => showToast('error', 'Failed to delete journal entry'),
  });
}

export function useReverseJournalEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<JournalEntry, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post<{ data: JournalEntry }>(ACCOUNTING.reverseJournalEntry(id));
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.all });
      showToast('success', 'Journal entry reversed');
    },
    onError: () => showToast('error', 'Failed to reverse journal entry'),
  });
}

export function useCreateFixedAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<FixedAsset, AxiosError, Partial<FixedAsset>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: FixedAsset }>(ACCOUNTING.FIXED_ASSETS, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
      showToast('success', 'Fixed asset created');
    },
    onError: () => showToast('error', 'Failed to create fixed asset'),
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<AccountingPeriod, AxiosError, number>({
    mutationFn: async (id) => {
      const { data } = await axiosInstance.post<{ data: AccountingPeriod }>(ACCOUNTING.closePeriod(id));
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.periods() });
      showToast('success', 'Period closed');
    },
    onError: () => showToast('error', 'Failed to close period'),
  });
}
