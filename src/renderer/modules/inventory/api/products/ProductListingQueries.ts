import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { PRODUCTS } from '../../../../shared/api/endpoints/endpoints';
import { refreshProductCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { inventoryKeys } from './ProductQueries';

export interface BulkListingPayload {
  ids: number[];
  channel: 'supply' | 'storefront';
  listed: boolean;
}

export function useBulkUpdateListing() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<{ updated: number }, AxiosError<ApiError>, BulkListingPayload>({
    networkMode: 'online',
    retry: false,
    mutationFn: async (payload) => {
      const { data } = await axiosInstance.post<{ updated: number }>(PRODUCTS.BULK_LISTING, payload);
      return data;
    },
    onSuccess: (_data, payload) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.products() });
      void refreshProductCatalogSnapshot();
      const action = payload.listed ? 'Listed' : 'Unlisted';
      const where = payload.channel === 'supply' ? 'for supply' : 'on public shop';
      showToast('success', `${action} ${payload.ids.length} product(s) ${where}`);
    },
    onError: () => {
      showToast('error', 'Could not update listing - check your connection');
    },
  });
}
