import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import type { ShiftRecord, ShiftWithSyncMeta } from '../../app/store/offline/sales/localShiftsStore';
import {
  completeOfflineClockIn,
  completeOfflineClockOutInstant,
  finalizeShiftClose,
  shouldUseLocalShiftActions,
  updateOfflineShiftOpeningBalance,
} from '../../app/store/offline/sales/completeOfflineShift';
import { shouldCompleteMutationLocally, sanitizeErrorMessage } from '../../app/store/offline/core/offlineQueryUtils';
import { shiftKeys, extractShiftPayload, persistActiveShiftContext, type Shift } from './ShiftQueries';

export function useClockIn() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError>({
    networkMode: 'always',
    retry: false,
    mutationFn: async () => {
      if (shouldUseLocalShiftActions()) {
        return completeOfflineClockIn();
      }

      try {
        const { data } = await axiosInstance.post(
          '/shifts',
          { clock_in: new Date().toISOString(), status: 'active' },
          { skipAuthRedirect: true },
        );
        const shift = extractShiftPayload(data);
        if (!shift) {
          throw new Error('Invalid shift response from server');
        }
        return persistActiveShiftContext(shift);
      } catch (err: unknown) {
        if (shouldCompleteMutationLocally()) {
          return completeOfflineClockIn();
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      if (!shift) return;
      qc.setQueryData(shiftKeys.active(), shift);
      if (shift._pendingSync) {
        showToast('success', 'Shift started locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Shift started');
      }
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Failed to start shift'));
    },
  });
}

export function useUpdateShiftOpeningBalance() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError, { id: number; openingBalance: number | null }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, openingBalance }) => {
      const currentShift = qc.getQueryData<Shift | null>(shiftKeys.active());

      if (shouldUseLocalShiftActions()) {
        return updateOfflineShiftOpeningBalance(id, openingBalance, currentShift as ShiftRecord | null);
      }

      try {
        const { data } = await axiosInstance.put(`/shifts/${id}`, { opening_balance: openingBalance });
        const shift = extractShiftPayload(data);
        if (!shift) throw new Error('Invalid shift response from server');
        qc.setQueryData(shiftKeys.active(), shift);
        return shift as ShiftWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteMutationLocally()) {
          return updateOfflineShiftOpeningBalance(id, openingBalance, currentShift as ShiftRecord | null);
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      if (!shift) return;
      qc.setQueryData(shiftKeys.active(), shift);
      if (shift._pendingSync) {
        showToast('success', 'Opening balance saved locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Opening balance saved');
      }
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Failed to save opening balance'));
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<ShiftWithSyncMeta, AxiosError, { id: number; totals: Record<string, number | null> }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, totals }) => {
      const currentShift = qc.getQueryData<Shift | null>(shiftKeys.active());

      if (shouldUseLocalShiftActions()) {
        return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
      }

      try {
        const { data } = await axiosInstance.put(
          `/shifts/${id}`,
          {
            clock_out: new Date().toISOString(),
            status: 'completed',
            total_sales: totals.total_sales,
            total_cash: totals.cash,
            total_mobile_money: totals.mobile_money,
            total_card: totals.card,
            counted_cash: totals.counted_cash ?? null,
          },
        );
        await finalizeShiftClose(id);
        const shift = extractShiftPayload(data);
        if (!shift) {
          throw new Error('Invalid shift response from server');
        }
        return shift as ShiftWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteMutationLocally()) {
          return completeOfflineClockOutInstant(id, totals, currentShift as ShiftRecord | null);
        }
        throw err;
      }
    },
    onSuccess: (shift) => {
      if (!shift) return;
      qc.setQueryData(shiftKeys.active(), null);
      qc.setQueryData<Shift[]>(shiftKeys.list(), (old) => [shift as Shift, ...(old ?? [])]);
      if (shift._pendingSync) {
        showToast('success', 'Shift ended locally — will sync when online');
      } else {
        qc.invalidateQueries({ queryKey: shiftKeys.all });
        showToast('success', 'Shift ended');
      }
    },
    onError: () => showToast('error', 'Failed to end shift'),
  });
}
