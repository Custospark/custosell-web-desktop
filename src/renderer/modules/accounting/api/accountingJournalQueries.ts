import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { ACCOUNTING } from '../../../shared/api/endpoints/endpoints';
import type { JournalEntry, JournalEntryLine } from './AccountingTypes';
import { accountingKeys } from './accountingQueryKeys';

export function useJournalEntries(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters ?? {});
  if (!params.has('per_page')) params.set('per_page', '500');
  const query = params.toString();
  return useQuery<JournalEntry[]>({
    queryKey: accountingKeys.journalEntries(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: JournalEntry[] }>(
        `${ACCOUNTING.JOURNAL_ENTRIES}?${query}`,
      );
      const list = Array.isArray(data.data) ? data.data : [];
      return [...list].sort((a, b) => {
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (byDate !== 0) return byDate;
        const byCreated = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (byCreated !== 0) return byCreated;
        return b.id - a.id;
      });
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
    retry: (count, err) => !(err as { isAxiosError?: boolean })?.isAxiosError && count < 1,
    networkMode: 'always',
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
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: accountingKeys.journalEntries() });
    },
    onSuccess: (entry) => {
      if (!entry) {
        qc.invalidateQueries({ queryKey: accountingKeys.journalEntries() });
        return;
      }
      qc.setQueryData<JournalEntry[]>(accountingKeys.journalEntries(), (old) => {
        if (!Array.isArray(old)) return [entry];
        if (old.some((e) => e.id === entry.id)) return old;
        return [entry, ...old];
      });
      qc.invalidateQueries({ queryKey: accountingKeys.all });
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
    onSuccess: (entry, id) => {
      qc.setQueryData<JournalEntry[]>(accountingKeys.journalEntries(), (old) =>
        old?.map((e) => e.id === id ? { ...e, ...entry, locked: true, posted_at: entry.posted_at } : e),
      );
      qc.invalidateQueries({ queryKey: accountingKeys.all });
      showToast('success', 'Journal entry posted');
    },
    onError: () => showToast('error', 'Failed to post journal entry'),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError, number>({
    mutationFn: async (id) => {
      await axiosInstance.delete(ACCOUNTING.journalEntry(id));
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: accountingKeys.journalEntries() });
      qc.setQueryData<JournalEntry[]>(accountingKeys.journalEntries(), (old) =>
        old?.filter((e) => e.id !== id),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountingKeys.all });
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
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: accountingKeys.journalEntries() });
    },
    onSuccess: (reversal) => {
      qc.setQueryData<JournalEntry[]>(accountingKeys.journalEntries(), (old) => {
        if (!Array.isArray(old)) return [reversal];
        if (old.some((e) => e.id === reversal.id)) return old;
        return [reversal, ...old];
      });
      qc.invalidateQueries({ queryKey: accountingKeys.all });
      showToast('success', 'Journal entry reversed');
    },
    onError: () => showToast('error', 'Failed to reverse journal entry'),
  });
}
