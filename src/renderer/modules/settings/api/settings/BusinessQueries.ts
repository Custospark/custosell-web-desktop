import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { BUSINESSES } from '../../../../shared/api/endpoints/endpoints';
import type { Business, UpdateBusinessData } from './BusinessTypes';
import { setBusiness } from '../../../../app/store/slices/authSlice';
import { useAppDispatch } from '../../../../app/store/hooks/useApp';
import { store } from '../../../../app/store/store';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { localBusinessSettingsStore, toBusinessWithSyncMeta, type BusinessWithSyncMeta } from '../../../../app/store/offline/settings/localBusinessSettingsStore';
import {
  completeOfflineUpdateBusinessInstant,
  shouldCompleteSettingsLocally,
} from '../../../../app/store/offline/settings/completeOfflineSettings';
import { businessToAuthInfo } from './businessAuthSync';

export { businessToAuthInfo, businessToTaxSettings, resolveBusinessForTax, resolveBusinessRecordForTax } from './businessAuthSync';

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'mine'] as const,
};

function businessFromAuth(): Business | null {
  const authUser = store.getState().auth.user;
  const business = authUser?.business;
  if (!authUser || !business) return null;

  return {
    created_at: '',
    updated_at: '',
    trial_ends_at: null,
    ...business,
    owner_id: business.owner_id ?? authUser.id,
    tax_regime: (business.tax_regime === 'vat_registered' ? 'vat_registered' : 'none') as Business['tax_regime'],
    default_vat_rate: business.default_vat_rate != null ? Number(business.default_vat_rate) : 18,
    jurisdiction: business.jurisdiction ?? 'UG',
    prices_include_tax: business.prices_include_tax !== false,
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
  const dispatch = useAppDispatch();
  const query = useQuery<BusinessWithSyncMeta>({
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

  useEffect(() => {
    if (!query.data) return;
    dispatch(setBusiness(businessToAuthInfo(query.data)));
  }, [query.data, dispatch]);

  return query;
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

      dispatch(setBusiness(businessToAuthInfo(business)));
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
