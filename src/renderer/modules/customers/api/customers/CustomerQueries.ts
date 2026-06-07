import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { CUSTOMERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { mutationQueue } from '../../../../app/store/offline/mutationQueue';
import { localCustomersStore, toCustomerWithSyncMeta, type CustomerWithSyncMeta } from '../../../../app/store/offline/localCustomersStore';
import {
  shouldCompleteCustomerLocally,
  completeOfflineCreateCustomerInstant,
  completeOfflineUpdateCustomerInstant,
  completeOfflineDeleteCustomerInstant,
} from '../../../../app/store/offline/completeOfflineCustomer';
import type { Customer, CreateCustomerData, UpdateCustomerData, CustomerPurchase } from './CustomerTypes';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: () => [...customerKeys.lists()] as const,
  customers: () => [...customerKeys.all, 'customers'] as const,
  customer: (id: number) => [...customerKeys.all, 'customers', id] as const,
  customerPurchases: (id: number) => [...customerKeys.all, 'customers', id, 'purchases'] as const,
};

/** ── Merge helpers ── */

async function loadLocalPendingCustomers(): Promise<CustomerWithSyncMeta[]> {
  const pending = await localCustomersStore.getPending();
  return pending
    .filter((r) => r.mutationType === 'create')
    .map(toCustomerWithSyncMeta);
}

function mergeCustomerLists(base: Customer[], local: CustomerWithSyncMeta[]): CustomerWithSyncMeta[] {
  const safeBase = base.filter(Boolean) as Customer[];
  const safeLocal = local.filter(Boolean) as CustomerWithSyncMeta[];
  const localIds = new Set(safeLocal.map((c) => c.id));
  const localPhones = new Set(safeLocal.map((c) => c.phone));
  const filtered = safeBase.filter((c) => !localIds.has(c.id) && !localPhones.has(c.phone));
  return [...safeLocal, ...filtered] as CustomerWithSyncMeta[];
}

/** ── Queries ── */

export function useCustomers() {
  return useQuery<CustomerWithSyncMeta[]>({
    queryKey: customerKeys.customers(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<Customer[]>(customerKeys.customers()) ?? [];
        const local = await loadLocalPendingCustomers();
        return mergeCustomerLists(cached, local);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Customer[] }>(CUSTOMERS.BASE, {
          timeout: 10000,
        });
        const local = await loadLocalPendingCustomers();
        return mergeCustomerLists(response.data, local);
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
          const cached = queryClient.getQueryData<Customer[]>(customerKeys.customers());
          const found = cached?.find((c) => c.id === id);
          if (!found) throw new Error('Customer not available offline');
          return found as CustomerWithSyncMeta;
        },
        fetchFromServer: async () => {
          const { data: response } = await axiosInstance.get<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`, {
            timeout: 10000,
          });
          return response.data as CustomerWithSyncMeta;
        },
      });
    },
    enabled: Boolean(id),
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
        const { data: r } = await axiosInstance.post<{ data: Customer }>(CUSTOMERS.BASE, p, { timeout: 10000 });
        return r.data as CustomerWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineCreateCustomerInstant(p);
        }
        throw err;
      }
    },
    onSuccess: (customer, _p) => {
      if (customer._pendingSync) {
        qc.setQueryData<CustomerWithSyncMeta[]>(customerKeys.customers(), (old) => {
          const list = old ?? [];
          if (list.some((c) => c.id === customer.id || c.phone === customer.phone)) return list;
          return [customer, ...list];
        });
        showToast('success', 'Customer saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: customerKeys.customers() });
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
      const cached = queryClient.getQueryData<Customer[]>(customerKeys.customers());
      const existing = cached?.find((c) => c.id === id);
      if (!existing) throw new Error('Customer not found');

      const isPendingOnly = (existing as CustomerWithSyncMeta)._pendingSync || id < 0;
      if (isPendingOnly) {
        return { ...existing, ...data, _pendingSync: true } as CustomerWithSyncMeta;
      }

      if (shouldCompleteCustomerLocally()) {
        return completeOfflineUpdateCustomerInstant(existing, data);
      }
      try {
        const { data: r } = await axiosInstance.put<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`, data, { timeout: 10000 });
        return r.data as CustomerWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineUpdateCustomerInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (customer, { id }) => {
      if (customer._pendingSync) {
        qc.setQueryData<CustomerWithSyncMeta[]>(customerKeys.customers(), (old) =>
          (old ?? []).map((c) => c.id === id ? customer : c),
        );
        showToast('success', 'Changes saved — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: customerKeys.customers() });
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
      const cached = qc.getQueryData<CustomerWithSyncMeta[]>(customerKeys.customers());
      const customer = cached?.find((c) => c.id === id);
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
        await axiosInstance.delete(`${CUSTOMERS.BASE}/${id}`, { timeout: 10000 });
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 404) {
          return;
        }
        if (!axiosErr.response) {
          completeOfflineDeleteCustomerInstant(id);
          return;
        }
        throw err;
      }
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<CustomerWithSyncMeta[]>(customerKeys.customers(), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
    },
    onError: (e, _id) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to delete customer'));
    },
  });
}
