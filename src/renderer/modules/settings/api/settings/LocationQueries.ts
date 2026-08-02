import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { LOCATIONS } from '../../../../shared/api/endpoints/endpoints';
import { isNetworkFailure, sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import { readWithOfflineStrategy } from '../../../../app/store/offline/core/offlineReadStrategy';
import { backupCatalogSnapshot, readCatalogBaseline, resolveAuthBusinessId } from '../../../../app/store/offline/catalogs/catalogSnapshotUtils';
import { loadLocationCatalogBaseline, refreshLocationCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import type { Location, CreateLocationData, UpdateLocationData } from './LocationTypes';

export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: () => [...locationKeys.lists()] as const,
  detail: (id: number) => [...locationKeys.all, 'detail', id] as const,
};

async function readLocationsBaseline(): Promise<Location[]> {
  return readCatalogBaseline('locations', locationKeys.list(), loadLocationCatalogBaseline);
}

function extractLocationFromResponse(responseData: unknown): Location | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Location };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Location;
  if ('id' in direct) return direct;
  return null;
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const validationMessage = axiosErr.response?.data?.errors
    ? Object.values(axiosErr.response.data.errors).flat().join(' ')
    : undefined;
  return validationMessage || axiosErr.response?.data?.message || sanitizeErrorMessage(err, fallback);
}

export function useLocations() {
  return useQuery<Location[]>({
    queryKey: locationKeys.list(),
    queryFn: async () => readWithOfflineStrategy({
      readFromClient: async () => {
        const baseline = await readLocationsBaseline();
        return baseline.filter(Boolean);
      },
      fetchFromServer: async () => {
        const { data: response } = await axiosInstance.get<{ data: Location[] }>(LOCATIONS.BASE);
        const list = Array.isArray(response.data) ? response.data : [];
        const businessId = resolveAuthBusinessId();
        if (businessId) {
          backupCatalogSnapshot('locations', businessId, list);
        }
        return list.filter(Boolean);
      },
    }),
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev,
    retry: (count, err) => !isNetworkFailure(err) && count < 1,
    networkMode: 'always',
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Location, AxiosError<ApiError>, CreateLocationData>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (p) => {
      const { data: r } = await axiosInstance.post<{ data: Location }>(LOCATIONS.BASE, p);
      const location = extractLocationFromResponse(r);
      if (!location) throw new Error('Invalid location response from server');
      return location;
    },
    onSuccess: (location) => {
      qc.setQueryData<Location[]>(locationKeys.list(), (old) => {
        const list = (old ?? []).filter(Boolean);
        if (list.some((l) => l.id === location.id || l.name === location.name)) return list;
        return [location, ...list];
      });
      void refreshLocationCatalogSnapshot();
      qc.invalidateQueries({ queryKey: locationKeys.list() });
      showToast('success', 'Branch created');
    },
    onError: (e) => {
      showToast('error', extractApiErrorMessage(e, 'Failed to create branch'));
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Location, AxiosError<ApiError>, { id: number; data: UpdateLocationData }>({
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ id, data }) => {
      const { data: r } = await axiosInstance.put<{ data: Location }>(LOCATIONS.BY_ID(id), data);
      const location = extractLocationFromResponse(r);
      if (!location) throw new Error('Invalid location response from server');
      return location;
    },
    onSuccess: (location, { id }) => {
      qc.setQueryData<Location[]>(locationKeys.list(), (old) =>
        (old ?? []).filter(Boolean).map((l) => l.id === id ? { ...l, ...location } : l),
      );
      qc.setQueryData(locationKeys.detail(id), location);
      void refreshLocationCatalogSnapshot();
      qc.invalidateQueries({ queryKey: locationKeys.list() });
      showToast('success', 'Branch updated');
    },
    onError: (e) => {
      showToast('error', extractApiErrorMessage(e, 'Failed to update branch'));
    },
  });
}

export function useSetDefaultLocation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Location, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      const { data: r } = await axiosInstance.post<{ data: Location }>(LOCATIONS.DEFAULT(id));
      const location = extractLocationFromResponse(r);
      if (!location) throw new Error('Invalid location response from server');
      return location;
    },
    onSuccess: (location) => {
      qc.setQueryData<Location[]>(locationKeys.list(), (old) =>
        (old ?? []).filter(Boolean).map((l) => ({
          ...l,
          is_default: l.id === location.id,
        })),
      );
      void refreshLocationCatalogSnapshot();
      qc.invalidateQueries({ queryKey: locationKeys.list() });
      showToast('success', `${location.name} is now the default branch`);
    },
    onError: (e) => {
      showToast('error', extractApiErrorMessage(e, 'Failed to set default branch'));
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number>({
    networkMode: 'always',
    retry: false,
    mutationFn: async (id) => {
      await axiosInstance.delete(LOCATIONS.BY_ID(id));
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Location[]>(locationKeys.list(), (old) =>
        (old ?? []).filter(Boolean).filter((l) => l.id !== id),
      );
      void refreshLocationCatalogSnapshot();
      showToast('success', 'Branch deleted');
    },
    onError: (e) => {
      showToast('error', extractApiErrorMessage(e, 'Failed to delete branch'));
    },
  });
}
