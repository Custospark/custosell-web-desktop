import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { BUSINESSES, BUSINESS_SOCIAL_LINKS } from '../../../../shared/api/endpoints/endpoints';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import type {
  Business,
  BusinessSocialLink,
  UpdateBusinessData,
  UpdateBusinessMutationInput,
  UpdateStorefrontProfileData,
  UpdateSupplyProfileData,
  UpsertBusinessSocialLinkData,
} from './BusinessTypes';
import { setBusiness, setUser, type AuthUser } from '../../../../app/store/slices/authSlice';
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
import { storefrontKeys } from '../../../storefront/api/storefrontQueryKeys';

export { businessToAuthInfo, businessToTaxSettings, resolveBusinessForTax, resolveBusinessRecordForTax } from './businessAuthSync';

function appendBusinessFormDataFields(formData: FormData, data: UpdateBusinessData): void {
  (Object.keys(data) as (keyof UpdateBusinessData)[]).forEach((key) => {
    const value = data[key];
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, '');
      return;
    }
    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
      return;
    }
    formData.append(key, String(value));
  });
}

export const businessKeys = {
  all: ['business'] as const,
  mine: () => [...businessKeys.all, 'mine'] as const,
};

export const socialLinksKeys = {
  all: ['business-social-links'] as const,
  list: () => [...socialLinksKeys.all, 'list'] as const,
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
    payment_bank_name: business.payment_bank_name ?? null,
    payment_bank_account_name: business.payment_bank_account_name ?? null,
    payment_bank_account_number: business.payment_bank_account_number ?? null,
    payment_bank_branch: business.payment_bank_branch ?? null,
    payment_mobile_money_provider: business.payment_mobile_money_provider ?? null,
    payment_mobile_money_account_name: business.payment_mobile_money_account_name ?? null,
    payment_mobile_money_number: business.payment_mobile_money_number ?? null,
    payment_instructions: business.payment_instructions ?? null,
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
        const { data: response } = await axiosInstance.get<{ data: Business }>(BUSINESSES.MINE);
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
    const info = businessToAuthInfo(query.data);
    const existing = store.getState().auth.user?.business;
    // Business endpoint subscription is never the source of truth - preserve /auth/me data
    info.subscription = existing?.subscription ?? info.subscription;
    dispatch(setBusiness(info));
  }, [query.data, dispatch]);

  return query;
}

export function useUpdateSupplyProfile() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  return useMutation<Business, AxiosError<ApiError>, UpdateSupplyProfileData>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.patch<{ data: Business }>(BUSINESSES.SUPPLY_PROFILE, data);
      return response.data;
    },
    onSuccess: (business) => {
      dispatch(setBusiness(businessToAuthInfo(business)));
      qc.setQueryData(businessKeys.mine(), (old: BusinessWithSyncMeta | undefined) =>
        old ? { ...old, ...business, _pendingSync: false } : (business as BusinessWithSyncMeta),
      );
      showToast(
        'success',
        business.is_open_for_supply ? 'Business is open for supply' : 'Business closed for supply',
      );
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to update supply profile'));
    },
  });
}

export function useUpdateStorefrontProfile() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation<Business, AxiosError<ApiError>, UpdateStorefrontProfileData>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (data) => {
      const { data: response } = await axiosInstance.patch<{ data: Business }>(
        BUSINESSES.STOREFRONT_PROFILE,
        data,
      );
      return response.data;
    },
    onSuccess: async (business) => {
      dispatch(setBusiness(businessToAuthInfo(business)));
      qc.setQueryData(businessKeys.mine(), (old: BusinessWithSyncMeta | undefined) =>
        old ? { ...old, ...business, _pendingSync: false } : (business as BusinessWithSyncMeta),
      );
      // Drop stale 404 / catalog caches so Open shop loads the live page after enable/disable.
      await Promise.all([
        qc.invalidateQueries({ queryKey: businessKeys.mine() }),
        qc.invalidateQueries({ queryKey: storefrontKeys.all }),
      ]);
      const slug = (business.slug ?? '').trim();
      if (slug) {
        await qc.invalidateQueries({ queryKey: storefrontKeys.shop(slug) });
        await qc.invalidateQueries({ queryKey: storefrontKeys.products(slug, '') });
        if (!business.storefront_enabled) {
          qc.removeQueries({ queryKey: storefrontKeys.shop(slug) });
          qc.removeQueries({ queryKey: storefrontKeys.products(slug, '') });
        }
      }
    },
  });
}

export function useCheckSlugAvailable() {
  return useMutation<{ available: boolean; slug: string; reason?: string }, AxiosError<ApiError>, string>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (slug) => {
      const { data } = await axiosInstance.get<{ available: boolean; slug: string; reason?: string }>(
        BUSINESSES.SLUG_AVAILABLE,
        { params: { slug } },
      );
      return data;
    },
  });
}

export function useBusinessSocialLinks() {
  return useQuery<BusinessSocialLink[]>({
    queryKey: socialLinksKeys.list(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: BusinessSocialLink[] }>(BUSINESS_SOCIAL_LINKS.LIST);
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useUpsertBusinessSocialLink() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<BusinessSocialLink, AxiosError<ApiError>, { id?: number; data: UpsertBusinessSocialLinkData }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, data }) => {
      if (id != null) {
        const { data: response } = await axiosInstance.put<{ data: BusinessSocialLink }>(
          BUSINESS_SOCIAL_LINKS.BY_ID(id),
          data,
        );
        return response.data;
      }
      const { data: response } = await axiosInstance.post<{ data: BusinessSocialLink }>(
        BUSINESS_SOCIAL_LINKS.CREATE,
        data,
      );
      return response.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: socialLinksKeys.all });
      await qc.invalidateQueries({ queryKey: storefrontKeys.all });
      showToast('success', 'Social link saved');
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to save social link'));
    },
  });
}

export function useDeleteBusinessSocialLink() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<unknown, AxiosError<ApiError>, number>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (id) => {
      await axiosInstance.delete(BUSINESS_SOCIAL_LINKS.BY_ID(id));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: socialLinksKeys.all });
      await qc.invalidateQueries({ queryKey: storefrontKeys.all });
      showToast('success', 'Social link removed');
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to remove social link'));
    },
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  return useMutation<BusinessWithSyncMeta, AxiosError<ApiError>, UpdateBusinessMutationInput>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ data, logoFile }) => {
      const existing = queryClient.getQueryData<BusinessWithSyncMeta>(businessKeys.mine()) ?? businessFromAuth();
      if (!existing) throw new Error('Business settings not available');

      if (logoFile) {
        if (shouldCompleteSettingsLocally()) {
          throw new Error('Business logo upload requires an internet connection');
        }
        const formData = new FormData();
        appendBusinessFormDataFields(formData, data);
        formData.append('logo', logoFile);
        const { data: response } = await axiosInstance.post<{ data: Business }>(
          `${BUSINESSES.PROFILE}?_method=PUT`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data as BusinessWithSyncMeta;
      }

      if (shouldCompleteSettingsLocally()) {
        return completeOfflineUpdateBusinessInstant(existing, data);
      }
      try {
        const { data: response } = await axiosInstance.put<{ data: Business }>(BUSINESSES.PROFILE, data);
        return response.data as BusinessWithSyncMeta;
      } catch (err: unknown) {
        if (shouldCompleteSettingsLocally()) {
          return completeOfflineUpdateBusinessInstant(existing, data);
        }
        throw err;
      }
    },
    onSuccess: (business, variables) => {
      if (!business) {
        qc.invalidateQueries({ queryKey: businessKeys.mine() });
        return;
      }

      // Personal accounts share name/phone/email between Account>Profile and
      // Business>Settings. Mirror any actually-changed shared fields onto the
      // auth user so the header, menus, and profile page stay in sync.
      const authUser = store.getState().auth.user;
      if (authUser?.account_type === 'personal') {
        const oldBusiness = qc.getQueryData<BusinessWithSyncMeta>(businessKeys.mine());
        const patch: Partial<AuthUser> = {};
        const nextName = variables.data.name;
        const nextPhone = variables.data.phone;
        const nextEmail = variables.data.email;
        if (nextName && oldBusiness?.name !== nextName) patch.name = nextName;
        if (nextPhone !== undefined && (oldBusiness?.phone ?? null) !== nextPhone) patch.phone = nextPhone;
        if (nextEmail !== undefined && (oldBusiness?.email ?? null) !== nextEmail) patch.email = nextEmail ?? undefined;
        if (Object.keys(patch).length > 0) {
          dispatch(setUser({ ...authUser, ...patch }));
        }
      }

      dispatch(setBusiness(businessToAuthInfo(business)));
      qc.setQueryData(businessKeys.mine(), business);
      showToast('success', business._pendingSync ? 'Business settings saved - will sync when online' : 'Business settings updated');
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

export function useBusinessExport() {
  const { showToast } = useToast();
  return useMutation<Blob, AxiosError<ApiError>, { format: string }>({
    retry: false,
    mutationFn: async ({ format }) => {
      const { data } = await axiosInstance.get(BUSINESSES.EXPORT, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob',
      });
      if (format === 'json') {
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      }
      return data as Blob;
    },
    onSuccess: (blob, { format }) => {
      const ext = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', `Data exported successfully as ${format.toUpperCase()}.`);
    },
    onError: (e) => {
      showToast('error', sanitizeErrorMessage(e, 'Failed to export data'));
    },
  });
}

export function useInitiateBusinessDelete() {
  const { showToast } = useToast();
  return useMutation<{ message: string; requires_delete_confirmation: boolean }, AxiosError<ApiError>, { password: string }>({
    retry: false,
    mutationFn: async ({ password }) => {
      const { data } = await axiosInstance.post<{ message: string; requires_delete_confirmation: boolean }>(
        BUSINESSES.DELETE_ACCOUNT_INITIATE,
        { password },
      );
      return data;
    },
    onError: (e) => {
      const message = (e.response?.data as { message?: string })?.message ?? 'Failed to start business account deletion';
      showToast('error', message);
    },
  });
}

export function useConfirmBusinessDelete() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<{ message: string; logged_out: boolean }, AxiosError<ApiError>, { code: string }>({
    retry: false,
    mutationFn: async ({ code }) => {
      const { data } = await axiosInstance.post<{ message: string; logged_out: boolean }>(
        BUSINESSES.DELETE_ACCOUNT_CONFIRM,
        { code },
      );
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries();
      showToast('success', data.message);
      window.location.assign(ROUTES.LOGIN);
    },
    onError: (e) => {
      const message = (e.response?.data as { message?: string })?.message ?? 'That security code is invalid or has expired.';
      showToast('error', message);
    },
  });
}
