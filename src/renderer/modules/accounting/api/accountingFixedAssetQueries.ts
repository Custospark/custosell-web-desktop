import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import type { FixedAsset, DepreciationEntry, DepreciationRunResult } from './AccountingTypes';
import { accountingKeys } from './accountingQueryKeys';

export function useFixedAssets(filters?: Record<string, string>) {
  const params = filters ? new URLSearchParams(filters).toString() : '';
  return useQuery<FixedAsset[]>({
    queryKey: accountingKeys.fixedAssets(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`${ACCOUNTING.FIXED_ASSETS}${params ? `?${params}` : ''}`);
      if (Array.isArray(data)) return data as FixedAsset[];
      if (Array.isArray(data?.data)) return data.data as FixedAsset[];
      if (Array.isArray(data?.data?.data)) return data.data.data as FixedAsset[];
      return [];
    },
  });
}

export function useFixedAsset(id: number, enabled = true) {
  return useQuery<FixedAsset>({
    queryKey: accountingKeys.fixedAsset(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: FixedAsset }>(ACCOUNTING.FIXED_ASSET(id));
      return data.data;
    },
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useFixedAssetSchedule(id: number, enabled = true) {
  return useQuery<DepreciationEntry[]>({
    queryKey: accountingKeys.fixedAssetSchedule(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: DepreciationEntry[] }>(ACCOUNTING.fixedAssetSchedule(id));
      return data.data ?? [];
    },
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useRunDepreciation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<DepreciationRunResult[], AxiosError, { period_id: number }>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: DepreciationRunResult[] }>(ACCOUNTING.runDepreciation, payload);
      return data.data ?? [];
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
      qc.invalidateQueries({ queryKey: ['hr', 'company-assets'] });
      const ok = results.filter((r) => r.status === 'depreciated' || r.status === 'posted' || r.status === 'success').length;
      showToast('success', ok ? `Depreciation posted for ${ok} asset(s)` : 'Depreciation run completed');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to run depreciation';
      showToast('error', msg);
    },
  });
}

function fixedAssetListPredicate(query: Query): boolean {
  const key = query.queryKey;
  return key[0] === 'accounting' && key[1] === 'fixed-assets' && key[2] !== 'detail';
}

export function useCreateFixedAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<FixedAsset, AxiosError, Partial<FixedAsset>>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ data: FixedAsset }>(ACCOUNTING.FIXED_ASSETS, payload);
      return data.data;
    },
    onSuccess: (asset) => {
      if (!asset?.id) {
        void qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
        void qc.invalidateQueries({ queryKey: ['hr', 'company-assets'] });
        showToast('success', 'Fixed asset created');
        return;
      }
      qc.setQueriesData<FixedAsset[]>(
        { queryKey: accountingKeys.fixedAssets(), predicate: fixedAssetListPredicate },
        (old) => {
          if (!Array.isArray(old)) return old;
          if (old.some((a) => a.id === asset.id)) {
            return old.map((a) => (a.id === asset.id ? asset : a));
          }
          return [asset, ...old];
        },
      );
      void qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
      void qc.invalidateQueries({ queryKey: ['hr', 'company-assets'] });
      showToast('success', 'Fixed asset created');
    },
    onError: () => showToast('error', 'Failed to create fixed asset'),
  });
}

export function useUpdateFixedAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<FixedAsset, AxiosError, Partial<FixedAsset> & { id: number }>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await axiosInstance.put<{ data: FixedAsset }>(ACCOUNTING.FIXED_ASSET(id), payload);
      return data.data;
    },
    onSuccess: (asset) => {
      qc.setQueriesData<FixedAsset[]>(
        { queryKey: accountingKeys.fixedAssets(), predicate: fixedAssetListPredicate },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((a) => (a.id === asset.id ? { ...a, ...asset } : a));
        },
      );
      qc.setQueryData(accountingKeys.fixedAsset(asset.id), asset);
      void qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
      void qc.invalidateQueries({ queryKey: accountingKeys.fixedAsset(asset.id) });
      void qc.invalidateQueries({ queryKey: accountingKeys.fixedAssetSchedule(asset.id) });
      void qc.invalidateQueries({ queryKey: ['hr', 'company-assets'] });
      showToast('success', 'Fixed asset updated');
    },
    onError: (err) => {
      const msg = (err.response?.data as { message?: string })?.message ?? 'Failed to update fixed asset';
      showToast('error', msg);
    },
  });
}
