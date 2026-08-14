import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import { useAppDispatch, useAppSelector } from '../../../../app/store/hooks/useApp';
import { setActiveLocation, setUser, type AuthLocation } from '../../../../app/store/slices/authSlice';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { STAFF_TRANSFERS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, isOfflineMode, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { staffKeys } from './StaffQueries';
import type { CreateStaffTransferData, StaffTransfer } from './StaffTypes';
import type { StaffWithSyncMeta } from '../../../../app/store/offline/settings/localStaffStore';

export const staffTransferKeys = {
  all: ['staff-transfers'] as const,
  lists: () => [...staffTransferKeys.all, 'list'] as const,
  list: () => [...staffTransferKeys.lists()] as const,
  detail: (id: number) => [...staffTransferKeys.all, 'detail', id] as const,
};

function extractTransferFromResponse(responseData: unknown): StaffTransfer {
  if (!responseData || typeof responseData !== 'object') throw new Error('Invalid staff transfer response');
  const wrapped = responseData as { data?: StaffTransfer };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as StaffTransfer;
  if ('id' in direct) return direct;
  throw new Error('Invalid staff transfer response');
}

const OFFLINE_TRANSFER_MESSAGE = 'Staff transfers require an online connection.';

export function useStaffTransfers() {
  return useQuery<StaffTransfer[]>({
    queryKey: staffTransferKeys.list(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StaffTransfer[] }>(STAFF_TRANSFERS.BASE);
      return Array.isArray(response.data) ? response.data.filter(Boolean) : [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useTransferStaff() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { showToast } = useToast();
  return useMutation<StaffTransfer, AxiosError<ApiError>, CreateStaffTransferData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (payload) => {
      if (isOfflineMode()) {
        throw new Error(OFFLINE_TRANSFER_MESSAGE);
      }
      const { data: r } = await axiosInstance.post<{ data: StaffTransfer }>(STAFF_TRANSFERS.BASE, payload);
      return extractTransferFromResponse(r);
    },
    onSuccess: (transfer) => {
      qc.setQueryData<StaffTransfer[]>(staffTransferKeys.list(), (old) => {
        const list = (old ?? []).filter(Boolean);
        if (list.some((t) => t.id === transfer.id)) return list;
        return [transfer, ...list];
      });

      // Reflect the branch move in the staff list so the Branch column updates immediately.
      const toId = transfer.to_location_id;
      if (toId != null) {
        qc.setQueryData<StaffWithSyncMeta[]>(staffKeys.list(), (old) =>
          (old ?? []).filter(Boolean).map((s) => {
            if (s.id !== transfer.user_id) return s;
            return {
              ...s,
              location_id: toId,
              location: transfer.to_location
                ? { id: transfer.to_location.id, name: transfer.to_location.name }
                : s.location,
              locations: transfer.to_location
                ? [{ id: transfer.to_location.id, name: transfer.to_location.name }, ...(s.locations ?? []).filter((l) => l.id !== toId)]
                : s.locations,
            };
          }),
        );
      }

      // If the transferred staff is the current signed-in user, update the auth slice so the
      // active branch in the UI follows them to the destination branch immediately.
      if (currentUser && transfer.user_id === currentUser.id && toId != null) {
        const toBranch: AuthLocation = transfer.to_location
          ? { id: transfer.to_location.id, name: transfer.to_location.name, code: '', is_default: false }
          : { id: toId, name: 'Branch', code: '', is_default: false };
        dispatch(setActiveLocation(toId));
        dispatch(setUser({
          ...currentUser,
          location_id: toId,
          location: toBranch,
          locations: [toBranch, ...(currentUser.locations ?? []).filter((l) => l.id !== toId)],
        }));
        // The signed-in operator moved branches - refetch products so New Sale / invoice
        // searches show the destination branch's stock.
        void qc.invalidateQueries({ queryKey: ['inventory', 'products'] });
      }

      showToast('success', `${transfer.user?.name ?? 'Staff member'} moved to ${transfer.to_location?.name ?? 'new branch'}`);
      qc.invalidateQueries({ queryKey: staffTransferKeys.list() });
      void qc.invalidateQueries({ queryKey: staffKeys.list() });
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to transfer staff'));
    },
  });
}
