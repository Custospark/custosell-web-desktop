import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import { PRODUCTS } from '../../../../shared/api/endpoints/endpoints';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { refreshProductCatalogSnapshot } from '../../../../app/store/offline/catalogs/catalogSnapshotRefresh';
import { inventoryKeys } from './ProductQueries';
import type { Product } from './ProductTypes';

function extractProductFromResponse(responseData: unknown): Product | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const obj = responseData as { data?: Product } & Product;
  if (obj.data && typeof obj.data === 'object' && 'id' in obj.data) return obj.data;
  if ('id' in obj && typeof obj.id === 'number') return obj as Product;
  return null;
}

export function useUpdateStorefrontListing() {
  const qc = useQueryClient();
  return useMutation<Product, AxiosError<ApiError>, { id: number; listed_for_storefront: boolean }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, listed_for_storefront }) => {
      const { data: res } = await axiosInstance.patch(PRODUCTS.STOREFRONT_LISTING(id), { listed_for_storefront });
      const product = extractProductFromResponse(res);
      if (!product) throw new Error('Invalid storefront listing response');
      return product;
    },
    onSuccess: (product, { id }) => {
      qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...product } : p)),
      );
      qc.setQueryData(inventoryKeys.product(id), product);
      void refreshProductCatalogSnapshot();
    },
  });
}

export function useUploadProductImage() {
  const qc = useQueryClient();
  return useMutation<Product, AxiosError<ApiError>, { id: number; file: File }>({
    networkMode: 'online',
    retry: false,
    mutationFn: async ({ id, file }) => {
      const form = new FormData();
      form.append('image', file);
      const { data: res } = await axiosInstance.post(PRODUCTS.IMAGE(id), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const product = extractProductFromResponse(res);
      if (!product) throw new Error('Invalid product image response');
      return product;
    },
    onSuccess: (product, { id }) => {
      qc.setQueryData<ProductWithSyncMeta[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...product } : p)),
      );
      qc.setQueryData(inventoryKeys.product(id), product);
      void refreshProductCatalogSnapshot();
    },
  });
}
