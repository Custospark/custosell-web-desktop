import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import { accountingKeys } from '../../accounting/api/AccountingQueries';
import type {
  AssetCategory,
  AssetCondition,
  FixedAsset,
  FixedAssetAssignment,
} from '../../accounting/api/AccountingTypes';
import type { Expense } from '../../expenses/api/ExpenseTypes';
import { HR_COMPANY_ASSETS_API } from './hrCompanyAssetsEndpoints';
import { hrCompanyAssetsKeys } from './hrCompanyAssetsKeys';

function unwrapEntity<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const body = payload as { data?: unknown };
    if (Array.isArray(body.data)) return body.data as T[];
    if (body.data && typeof body.data === 'object') {
      const nested = (body.data as { data?: unknown }).data;
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function cleanParams(params?: Record<string, string | number | undefined | null>) {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

const listDefaults = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
};

export type CreateCompanyAssetPayload = {
  name: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  purchase_date: string;
  account_id?: number | null;
  category?: AssetCategory | null;
  asset_tag?: string | null;
  serial_number?: string | null;
  location?: string | null;
  condition?: AssetCondition | null;
  notes?: string | null;
};

export type UpdateCompanyAssetCustodyPayload = {
  id: number;
  name?: string;
  cost?: number;
  salvage_value?: number;
  useful_life_months?: number;
  purchase_date?: string;
  asset_tag?: string | null;
  serial_number?: string | null;
  category?: AssetCategory | null;
  location?: string | null;
  condition?: AssetCondition | null;
  notes?: string | null;
};

export type AssignCompanyAssetPayload = {
  id: number;
  employee_id: number;
  notes?: string | null;
};

export type TransferCompanyAssetPayload = {
  id: number;
  employee_id: number;
  notes?: string | null;
};

export type ReturnCompanyAssetPayload = {
  id: number;
  notes?: string | null;
  occurred_at?: string | null;
};

function useCompanyAssetErrorToast() {
  const { showToast } = useToast();
  return (err: AxiosError<{ message?: string }>, fallback: string) => {
    showToast('error', sanitizeErrorMessage(err, fallback));
  };
}

function patchAssetLists(qc: ReturnType<typeof useQueryClient>, asset: FixedAsset) {
  const updater = (old: FixedAsset[] | undefined) => {
    if (!old) return [asset];
    const exists = old.some((a) => a.id === asset.id);
    if (!exists) return [asset, ...old];
    return old.map((a) => (a.id === asset.id ? { ...a, ...asset } : a));
  };
  qc.setQueriesData<FixedAsset[]>({ queryKey: hrCompanyAssetsKeys.all }, updater);
  qc.setQueriesData<FixedAsset[]>({ queryKey: accountingKeys.fixedAssets() }, updater);
  qc.setQueryData(hrCompanyAssetsKeys.detail(asset.id), asset);
}

function invalidateAssetCaches(qc: ReturnType<typeof useQueryClient>, asset?: FixedAsset) {
  if (asset) patchAssetLists(qc, asset);
  void qc.invalidateQueries({ queryKey: hrCompanyAssetsKeys.all });
  void qc.invalidateQueries({ queryKey: accountingKeys.fixedAssets() });
  if (asset?.id) {
    void qc.invalidateQueries({ queryKey: hrCompanyAssetsKeys.detail(asset.id) });
    void qc.invalidateQueries({ queryKey: hrCompanyAssetsKeys.assignments(asset.id) });
    void qc.invalidateQueries({ queryKey: accountingKeys.fixedAsset(asset.id) });
  }
}

export function useHrCompanyAssets(filters?: Record<string, string | number | undefined>) {
  const params = cleanParams(filters);
  return useQuery({
    queryKey: hrCompanyAssetsKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR_COMPANY_ASSETS_API.LIST, { params });
      return unwrapList<FixedAsset>(data);
    },
    ...listDefaults,
  });
}

export function useHrCompanyAsset(id: number, enabled = true) {
  return useQuery({
    queryKey: hrCompanyAssetsKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR_COMPANY_ASSETS_API.ITEM(id));
      return unwrapEntity<FixedAsset>(data);
    },
    enabled: enabled && Number.isFinite(id) && id > 0,
    ...listDefaults,
  });
}

export function useCreateHrCompanyAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useCompanyAssetErrorToast();
  return useMutation<FixedAsset, AxiosError<{ message?: string }>, CreateCompanyAssetPayload>({
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post(HR_COMPANY_ASSETS_API.LIST, payload);
      return unwrapEntity<FixedAsset>(data);
    },
    onSuccess: (asset) => {
      invalidateAssetCaches(qc, asset);
      showToast('success', 'Company asset created');
    },
    onError: (err) => onError(err, 'Failed to create company asset'),
  });
}

export function useUpdateHrCompanyAssetCustody() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useCompanyAssetErrorToast();
  return useMutation<FixedAsset, AxiosError<{ message?: string }>, UpdateCompanyAssetCustodyPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await axiosInstance.patch(HR_COMPANY_ASSETS_API.ITEM(id), payload);
      return unwrapEntity<FixedAsset>(data);
    },
    onSuccess: (asset) => {
      invalidateAssetCaches(qc, asset);
      showToast('success', 'Asset details updated');
    },
    onError: (err) => onError(err, 'Failed to update asset'),
  });
}

export function useAssignHrCompanyAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useCompanyAssetErrorToast();
  return useMutation<FixedAsset, AxiosError<{ message?: string }>, AssignCompanyAssetPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await axiosInstance.post(HR_COMPANY_ASSETS_API.assign(id), payload);
      return unwrapEntity<FixedAsset>(data);
    },
    onSuccess: (asset) => {
      invalidateAssetCaches(qc, asset);
      showToast('success', 'Asset assigned');
    },
    onError: (err) => onError(err, 'Failed to assign asset'),
  });
}

export function useTransferHrCompanyAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useCompanyAssetErrorToast();
  return useMutation<FixedAsset, AxiosError<{ message?: string }>, TransferCompanyAssetPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await axiosInstance.post(HR_COMPANY_ASSETS_API.transfer(id), payload);
      return unwrapEntity<FixedAsset>(data);
    },
    onSuccess: (asset) => {
      invalidateAssetCaches(qc, asset);
      showToast('success', 'Asset transferred');
    },
    onError: (err) => onError(err, 'Failed to transfer asset'),
  });
}

export function useReturnHrCompanyAsset() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const onError = useCompanyAssetErrorToast();
  return useMutation<FixedAsset, AxiosError<{ message?: string }>, ReturnCompanyAssetPayload>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await axiosInstance.post(HR_COMPANY_ASSETS_API.return(id), payload);
      return unwrapEntity<FixedAsset>(data);
    },
    onSuccess: (asset) => {
      invalidateAssetCaches(qc, asset);
      showToast('success', 'Asset returned');
    },
    onError: (err) => onError(err, 'Failed to return asset'),
  });
}

export function useHrCompanyAssetAssignments(id: number, enabled = true) {
  return useQuery({
    queryKey: hrCompanyAssetsKeys.assignments(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR_COMPANY_ASSETS_API.assignments(id));
      return unwrapList<FixedAssetAssignment>(data);
    },
    enabled: enabled && Number.isFinite(id) && id > 0,
    ...listDefaults,
  });
}

export function useHrCompanyAssetMaintenanceExpenses(id: number, enabled = true) {
  return useQuery({
    queryKey: hrCompanyAssetsKeys.maintenanceExpenses(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(HR_COMPANY_ASSETS_API.maintenanceExpenses(id));
      return unwrapList<Expense>(data);
    },
    enabled: enabled && Number.isFinite(id) && id > 0,
    ...listDefaults,
  });
}
