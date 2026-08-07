import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { EXPENSES } from '../../../shared/api/endpoints/endpoints';
import { expenseKeys } from '../../../shared/utils/expenseKeys';
import type { ExpenseAttachment } from './ExpenseTypes';

export function useUploadExpenseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, file }: { expenseId: number; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await axiosInstance.post(`${EXPENSES}/${expenseId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as ExpenseAttachment;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: expenseKeys.detail(variables.expenseId) });
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useCreateExpenseAttachmentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, url, title }: { expenseId: number; url: string; title?: string }) => {
      const { data } = await axiosInstance.post(`${EXPENSES}/${expenseId}/attachments/link`, { url, title });
      return data.data as ExpenseAttachment;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: expenseKeys.detail(variables.expenseId) });
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDeleteExpenseAttachment(expenseId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`/expense-attachments/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: expenseKeys.detail(expenseId) });
      void qc.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
