import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { BUSINESSES } from '../../../../shared/api/endpoints/endpoints';
import type { Business, UpdateBusinessData } from './BusinessTypes';
import { setBusiness } from '../../../../app/store/slices/authSlice';
import { useAppDispatch } from '../../../../app/store/hooks/useApp';
import { store } from '../../../../app/store/store';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/offlineReadStrategy';
import { localBusinessSettingsStore, toBusinessWithSyncMeta, type BusinessWithSyncMeta } from '../../../../app/store/offline/localBusinessSettingsStore';
import {
  completeOfflineUpdateBusinessInstant,
  shouldCompleteSettingsLocally,
} from '../../../../app/store/offline/completeOfflineSettings';

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'mine'] as const,
};

function businessFromAuth(): Business | null {
  const authUser = store.getState().auth.user;
  const business = authUser?.business;
  if (!business) return null;

  return {
    owner_id: authUser.id,
    created_at: '',
    updated_at: '',
    trial_ends_at: null,
    ...business,
  };
}

async function applyPendingBusiness(base: Business | null): Promise<BusinessWithSyncMeta> {
  const pending = await localBusinessSettingsStore.getLatestPending();
  if (pending) {
    return toBusinessWithSyncMeta(pending);
  }
  if (base) return base as BusinessWithSyncMeta;
  throw new Error('Business settings not available offline');
}

export function useBusiness() {
  return useQuery<BusinessWithSyncMeta>({
    queryKey: businessKeys.mine(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const cached = queryClient.getQueryData<Business>(businessKeys.mine()) ?? businessFromAuth();
        return applyPendingBusiness(cached);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Business }>(BUSINESSES.MINE, {
          timeout: 10000,
        });
        return applyPendingBusiness(response.data);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  return useMutation<BusinessWithSyncMeta, AxiosError<ApiError>, UpdateBusinessData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (data) => {
      const existing = queryClient.getQueryData<BusinessWithSyncMeta>(businessKeys.mine()) ?? businessFromAuth();
      if (!existing) throw new Error('Business settings not available');

      if (shouldCompleteSettingsLocally()) {
        return completeOfflineUpdateBusinessInstant(existing, data);
      }
      try {
        const { data: response } = await axiosInstance.put<{ data: Business }>(BUSINESSES.PROFILE, data, {
          timeout: 10000,
        });
        return response.data as BusinessWithSyncMeta;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        if (!axiosErr.response) {
          return completeOfflineUpdateBusinessInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (business) => {
      if (!business) {
        qc.invalidateQueries({ queryKey: businessKeys.mine() });
        return;
      }

      dispatch(setBusiness(business));
      qc.setQueryData(businessKeys.mine(), business);
      showToast('success', business._pendingSync ? 'Business settings saved — will sync when online' : 'Business settings updated');
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update business settings'));
    },
    onSettled: () => {
      const current = qc.getQueryData<BusinessWithSyncMeta>(businessKeys.mine());
      if (!current?._pendingSync) {
        qc.invalidateQueries({ queryKey: businessKeys.mine() });
      }
    },
  });
}
