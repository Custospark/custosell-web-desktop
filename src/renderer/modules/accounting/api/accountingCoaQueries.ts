import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import type { ChartOfAccount, AccountingPeriod } from './AccountingTypes';
import { accountingKeys } from './accountingQueryKeys';

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
