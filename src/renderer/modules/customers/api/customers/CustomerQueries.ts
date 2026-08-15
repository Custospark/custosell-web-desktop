import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { CUSTOMERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { backupCatalogSnapshot, readCatalogBaseline, resolveAuthBusinessId } from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import { loadCustomerCatalogBaseline, refreshCustomerCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { mutationQueue } from '../../../../app/store/offline/sync/mutationQueue';
import { localCustomersStore, toCustomerWithSyncMeta, type CustomerWithSyncMeta } from '../../../../app/store/offline/customers/localCustomersStore';
import {
  shouldCompleteCustomerLocally,
  completeOfflineCreateCustomerInstant,
  completeOfflineUpdateCustomerInstant,
  completeOfflineUpdatePendingCustomer,
  completeOfflineDeleteCustomerInstant,
} from '../../../../app/store/offline/customers/completeOfflineCustomer';
import type { Customer, CreateCustomerData, UpdateCustomerData, CustomerPurchase, CustomerOverviewData } from './CustomerTypes';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: () => [...customerKeys.lists()] as const,
  customers: () => [...customerKeys.all, 'customers'] as const,
  customer: (id: number) => [...customerKeys.all, 'customers', id] as const,
  customerPurchases: (id: number) => [...customerKeys.all, 'customers', id, 'purchases'] as const,
  overview: () => [...customerKeys.all, 'overview'] as const,
};

/** ── Merge helpers ── */

async function loadLocalPendingCustomers(): Promise<CustomerWithSyncMeta[]> {
  const pending = await localCustomersStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toCustomerWithSyncMeta);
}

function sanitizeCustomerList(list: CustomerWithSyncMeta[] = []): CustomerWithSyncMeta[] {
  return list.filter(Boolean) as CustomerWithSyncMeta[];
}

function mergeCustomerLists(base: Customer[], local: CustomerWithSyncMeta[]): CustomerWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Customer[];
  const safeLocal = local.filter(Boolean) as CustomerWithSyncMeta[];
  const localIds = new Set(safeLocal.map((c) => c.id));
  const localPhones = new Set(safeLocal.map((c) => c.phone));
  const filtered = safeBase.filter((c) => !localIds.has(c.id) && !localPhones.has(c.phone));
  return [...safeLocal, ...filtered] as CustomerWithSyncMeta[];
}

function patchCustomerCache(
  qc: ReturnType<typeof useQueryClient>,
  patch: (old: CustomerWithSyncMeta[]) => CustomerWithSyncMeta[],
): void {
  const next = sanitizeCustomerList(patch(sanitizeCustomerList(qc.getQueryData<CustomerWithSyncMeta[]>(customerKeys.customers()) ?? [])));
  qc.setQueryData<CustomerWithSyncMeta[]>(customerKeys.customers(), next);
  // Keep the POS customer picker (keyed ['customers']) in sync live.
  qc.setQueryData<CustomerWithSyncMeta[]>(['customers'], (old) =>
    sanitizeCustomerList(patch(sanitizeCustomerList(old ?? []))),
  );
}

/** Invalidate all customer caches including the POS picker list. */
function invalidateCustomerCaches(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: customerKeys.customers() });
  void qc.invalidateQueries({ queryKey: ['customers'] });
}

async function readCustomersBaseline(): Promise<Customer[]> {
  return readCatalogBaseline('customers', customerKeys.customers(), loadCustomerCatalogBaseline);
}

/** ── Queries ── */

export function useCustomers() {
  return useQuery<CustomerWithSyncMeta[]>({
    queryKey: customerKeys.customers(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const baseline = await readCustomersBaseline();
        const local = await loadLocalPendingCustomers();
        return mergeCustomerLists(baseline, local);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Customer[] }>(CUSTOMERS.BASE);
        const list = Array.isArray(response.data) ? response.data : [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupCatalogSnapshot('customers', businessId, list);
        }
        const local = await loadLocalPendingCustomers();
        return mergeCustomerLists(list, local);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useCustomer(id: number) {
  return useQuery<CustomerWithSyncMeta>({
    queryKey: customerKeys.customer(id),
    queryFn: async () => {
      if (id < 0) {
        const local = await localCustomersStore.getPending();
        const match = local.find((r) => r.customer.id === id);
        if (match) return toCustomerWithSyncMeta(match);
      }
      return readWithOfflineStrategy({
        readFromClient: async () => {
          const baseline = await readCustomersBaseline();
          const found = baseline.find((c) => c.id === id);
          if (!found) throw new Error('Customer not available offline');
          return found as CustomerWithSyncMeta;
        },
        fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`);
          return response.data as CustomerWithSyncMeta;
        },
      });
    },
    enabled: Boolean(id),
  });
}

export function useCustomerOverview() {
  return useQuery<CustomerOverviewData>({
    queryKey: customerKeys.overview(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<CustomerOverviewData>(CUSTOMERS.OVERVIEW);
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useCustomerPurchases(id: number) {
  return useQuery<CustomerPurchase[]>({
    queryKey: customerKeys.customerPurchases(id),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: CustomerPurchase[] }>(CUSTOMERS.PURCHASES(id));
      return response.data;
    },
    enabled: Boolean(id),
  });
}

/** ── Mutations ── */

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<CustomerWithSyncMeta, AxiosError<ApiError>, CreateCustomerData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      if (shouldCompleteCustomerLocally()) {
        return completeOfflineCreateCustomerInstant(p);
      }
      try {
        const { data: r } = await axiosInstance.post<{ data: Customer }>(CUSTOMERS.BASE, p);
        return r.data as CustomerWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteCustomerLocally()) {
          return completeOfflineCreateCustomerInstant(p);
        }
        throw err;
      }
    },
    onSuccess: (customer) => {
      if (!customer) {
        void refreshCustomerCatalogSnapshot();
        invalidateCustomerCaches(qc);
        return;
      }
      if (customer._pendingSync) {
        patchCustomerCache(qc, (old) => {
          if (old.some((c) => c.id === customer.id || c.phone === customer.phone)) return old;
          return [customer, ...old];
        });
        showToast('success', 'Customer saved - will sync when online');
      } else {
        void refreshCustomerCatalogSnapshot();
        invalidateCustomerCaches(qc);
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to create customer'));
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<CustomerWithSyncMeta, AxiosError<ApiError>, { id: number; data: UpdateCustomerData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const cached = sanitizeCustomerList(queryClient.getQueryData<CustomerWithSyncMeta[]>(customerKeys.customers()));
      const existing = cached.find((c) => c.id === id);
      if (!existing) throw new Error('Customer not found');

      const isPendingOnly = (existing as CustomerWithSyncMeta)._pendingSync || id < 0;
      if (isPendingOnly) {
        return completeOfflineUpdatePendingCustomer(existing, data);
      }

      if (shouldCompleteCustomerLocally()) {
        return completeOfflineUpdateCustomerInstant(existing, data);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`, data);
        return r.data as CustomerWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteCustomerLocally()) {
          return completeOfflineUpdateCustomerInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (customer, { id }) => {
      if (!customer) {
        void refreshCustomerCatalogSnapshot();
        invalidateCustomerCaches(qc);
        return;
      }
      if (customer._pendingSync) {
        patchCustomerCache(qc, (old) =>
          old.map((c) => c.id === id ? customer : c),
        );
        showToast('success', 'Changes saved - will sync when online');
      } else {
        void refreshCustomerCatalogSnapshot();
        invalidateCustomerCaches(qc);
      }
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update customer'));
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const cached = sanitizeCustomerList(qc.getQueryData<CustomerWithSyncMeta[]>(customerKeys.customers()));
      const customer = cached.find((c) => c.id === id);
      const isPendingOnly = customer?._pendingSync || id < 0;

      if (isPendingOnly) {
        const mutationId = await localCustomersStore.removeByCustomerId(id);
        if (mutationId) {
          await mutationQueue.removeById(mutationId);
        }
        return;
      }

      if (shouldCompleteCustomerLocally()) {
        completeOfflineDeleteCustomerInstant(id);
        return;
      }
      try {
        await axiosInstance.delete(`${CUSTOMERS.BASE}/${id}`);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
          return;
        }
        if (shouldCompleteCustomerLocally()) {
          completeOfflineDeleteCustomerInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      patchCustomerCache(qc, (old) =>
        old.filter((c) => c.id !== id),
      );
      void refreshCustomerCatalogSnapshot();
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete customer'));
    },
  });
}
