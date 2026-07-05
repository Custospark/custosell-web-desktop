import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { CUSTOMERS, SALES } from '../api/endpoints/endpoints';
import { customerKeys } from '../../modules/customers/api/customers/CustomerQueries';
import { salesKeys } from '../../modules/sales/api/salesQueries';
import type { Customer } from '../../modules/customers/api/customers/CustomerTypes';
import type { CustomerContactValue } from '../utils/customerContactUtils';

export interface ResolveCustomerContactInput {
  customerId?: number | null;
  name?: string;
  email?: string;
  phone?: string;
}

export function useResolveCustomerContact() {
  const qc = useQueryClient();

  return useMutation<Customer, AxiosError, ResolveCustomerContactInput>({
    mutationFn: async (input) => {
      const body: Record<string, string | number> = {};
      if (input.customerId) body.customer_id = input.customerId;
      const name = input.name?.trim();
      const email = input.email?.trim();
      const phone = input.phone?.trim();
      if (name) body.name = name;
      if (email) body.email = email;
      if (phone) body.phone = phone;

      const { data } = await axiosInstance.post<{ data: Customer }>(CUSTOMERS.RESOLVE, body);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customerKeys.customers() });
    },
  });
}

export function useAssignSaleCustomer() {
  const qc = useQueryClient();

  return useMutation<unknown, AxiosError, { saleId: number; customerId: number }>({
    mutationFn: async ({ saleId, customerId }) => {
      const { data } = await axiosInstance.patch(SALES.ASSIGN_CUSTOMER(saleId), { customer_id: customerId });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: salesKeys.all });
    },
  });
}

export function contactFromValue(value: CustomerContactValue): ResolveCustomerContactInput {
  return {
    customerId: value.customerId,
    name: value.name.trim() || undefined,
    email: value.email.trim() || undefined,
    phone: value.phone.trim() || undefined,
  };
}

export function hasResolvableContact(value: CustomerContactValue, toEmail: string): boolean {
  return Boolean(
    value.customerId
    || value.name.trim()
    || value.email.trim()
    || value.phone.trim()
    || toEmail.trim(),
  );
}
