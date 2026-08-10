import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { INVENTORY_OVERVIEW } from '../../../../shared/api/endpoints/endpoints';
import { inventoryKeys } from '../products/inventoryKeys';
import type { InventoryOverviewData } from './InventoryOverviewTypes';

/**
 * Inventory & Supply Chain → Overview.
 *
 * Mirrors the Expenses overview pattern: fresh server read (staleTime 0) with an
 * optional `?location_id` scope. Retains the last good response when the network
 * flaps so the branch switch never flashes a blank screen.
 */
export function useInventoryOverview(locationId?: number) {
  return useQuery<InventoryOverviewData>({
    queryKey: [...inventoryKeys.overview(), { locationId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.set('location_id', String(locationId));
      const query = params.toString();
      const { data } = await axiosInstance.get<InventoryOverviewData>(`${INVENTORY_OVERVIEW}${query ? `?${query}` : ''}`);
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    placeholderData: (prev) => prev,
  });
}