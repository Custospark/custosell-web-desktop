import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { CUSTOMERS } from '../../../../shared/api/endpoints/endpoints';
import type { Customer, CreateCustomerData, UpdateCustomerData, CustomerPurchase } from './CustomerTypes';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: () => [...customerKeys.lists()] as const,
  customers: () => [...customerKeys.all, 'customers'] as const,
  customer: (id: number) => [...customerKeys.all, 'customers', id] as const,
  customerPurchases: (id: number) => [...customerKeys.all, 'customers', id, 'purchases'] as const,
};

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: customerKeys.customers(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Customer[] }>(CUSTOMERS.BASE);
      return response.data;
    },
  });
}

export function useCustomer(id: number) {
  return useQuery<Customer>({
    queryKey: customerKeys.customer(id),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`);
      return response.data;
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

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Customer, AxiosError<ApiError>, CreateCustomerData, { previous: Customer[] | undefined }>({
    mutationFn: async (p) => { const { data: r } = await axiosInstance.post<{ data: Customer }>(CUSTOMERS.BASE, p); return r.data; },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: customerKeys.customers() });
      const previous = qc.getQueryData<Customer[]>(customerKeys.customers());
      qc.setQueryData<Customer[]>(customerKeys.customers(), (old) => [...(old ?? []), {
        id: Date.now(), business_id: 0, name: p.name, phone: p.phone, email: p.email ?? null,
        total_purchases: '0', last_purchase_at: null,
      } as Customer]);
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(customerKeys.customers(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to create customer'); },
    onSettled: () => qc.invalidateQueries({ queryKey: customerKeys.customers() }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Customer, AxiosError<ApiError>, { id: number; data: UpdateCustomerData }, { previous: Customer[] | undefined }>({
    mutationFn: async ({ id, data }) => { const { data: r } = await axiosInstance.put<{ data: Customer }>(`${CUSTOMERS.BASE}/${id}`, data); return r.data; },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: customerKeys.customers() });
      const previous = qc.getQueryData<Customer[]>(customerKeys.customers());
      qc.setQueryData<Customer[]>(customerKeys.customers(), (old) => (old ?? []).map((c) => c.id === id ? { ...c, ...data, email: data.email ?? null } as Customer : c));
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(customerKeys.customers(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to update customer'); },
    onSettled: () => qc.invalidateQueries({ queryKey: customerKeys.customers() }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number, { previous: Customer[] | undefined }>({
    mutationFn: async (id) => { await axiosInstance.delete(`${CUSTOMERS.BASE}/${id}`); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: customerKeys.customers() });
      const previous = qc.getQueryData<Customer[]>(customerKeys.customers());
      qc.setQueryData<Customer[]>(customerKeys.customers(), (old) => (old ?? []).filter((c) => c.id !== id));
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (e.response?.status === 404) {
        qc.invalidateQueries({ queryKey: customerKeys.customers() });
        return;
      }
      if (ctx?.previous) qc.setQueryData(customerKeys.customers(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to delete customer');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: customerKeys.customers() }),
  });
}
