import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import type { ApiError } from '../../../../shared/api/account/AccountTypes';
import type {
  Category, Product, StockMovement,
  CreateCategoryData, CreateProductData, UpdateProductData, CreateStockMovementData,
} from './ProductTypes';

export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  product: (id: number) => [...inventoryKeys.all, 'products', id] as const,
  lowStock: () => [...inventoryKeys.all, 'products', 'low-stock'] as const,
  productStockMovements: (productId: number) => [...inventoryKeys.all, 'products', productId, 'stock-movements'] as const,
  stockMovements: () => [...inventoryKeys.all, 'stock-movements'] as const,
};

/** ── Categories ── */

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: inventoryKeys.categories(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Category[] }>('/categories');
      return response.data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Category, AxiosError<ApiError>, CreateCategoryData, { previous: Category[] | undefined }>({
    mutationFn: async (p) => { const { data: r } = await axiosInstance.post<{ data: Category }>('/categories', p); return r.data; },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.categories() });
      const previous = qc.getQueryData<Category[]>(inventoryKeys.categories());
      qc.setQueryData<Category[]>(inventoryKeys.categories(), (old) => [...(old ?? []), { id: Date.now(), business_id: 0, name: p.name, description: p.description ?? null, sort_order: p.sort_order ?? 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(inventoryKeys.categories(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to create category'); },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.categories() }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Category, AxiosError<ApiError>, { id: number; data: CreateCategoryData }, { previous: Category[] | undefined }>({
    mutationFn: async ({ id, data }) => { const { data: r } = await axiosInstance.put<{ data: Category }>(`/categories/${id}`, data); return r.data; },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.categories() });
      const previous = qc.getQueryData<Category[]>(inventoryKeys.categories());
      qc.setQueryData<Category[]>(inventoryKeys.categories(), (old) => (old ?? []).map((c) => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c));
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(inventoryKeys.categories(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to update category'); },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.categories() }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number, { previous: Category[] | undefined }>({
    mutationFn: async (id) => { await axiosInstance.delete(`/categories/${id}`); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.categories() });
      const previous = qc.getQueryData<Category[]>(inventoryKeys.categories());
      qc.setQueryData<Category[]>(inventoryKeys.categories(), (old) => (old ?? []).filter((c) => c.id !== id));
      return { previous };
    },
    onError: (e, _id, ctx) => { if (ctx?.previous) qc.setQueryData(inventoryKeys.categories(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to delete category'); },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.categories() }),
  });
}

/** ── Products ── */

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: inventoryKeys.products(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Product[] }>('/products');
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useProduct(id: number) {
  return useQuery<Product>({
    queryKey: inventoryKeys.product(id),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Product }>(`/products/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
}

export function useLowStockProducts() {
  return useQuery<Product[]>({
    queryKey: inventoryKeys.lowStock(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: Product[] }>('/products/low-stock');
      return response.data;
    },
  });
}

export function useProductStockMovements(productId: number) {
  return useQuery<StockMovement[]>({
    queryKey: inventoryKeys.productStockMovements(productId),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StockMovement[] }>(`/products/${productId}/stock-movements`);
      return response.data;
    },
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Product, AxiosError<ApiError>, CreateProductData, { previous: Product[] | undefined }>({
    mutationFn: async (p) => { const { data: r } = await axiosInstance.post<{ data: Product }>('/products', p); return r.data; },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.products() });
      const previous = qc.getQueryData<Product[]>(inventoryKeys.products());
      qc.setQueryData<Product[]>(inventoryKeys.products(), (old) => [...(old ?? []), {
        id: Date.now(), business_id: 0, category_id: p.category_id ?? null, category: null,
        name: p.name, unit: p.unit ?? null, description: p.description ?? null, sku: p.sku ?? null, barcode: p.barcode ?? null,
        unit_price: String(p.unit_price), wholesale_price: p.wholesale_price != null ? String(p.wholesale_price) : null, cost_price: p.cost_price != null ? String(p.cost_price) : null,
        stock_quantity: p.stock_quantity ?? 0, low_stock_threshold: p.low_stock_threshold ?? 5,
        tax_percentage: String(p.tax_percentage ?? 0), is_active: p.is_active ?? true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      } as Product]);
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(inventoryKeys.products(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to create product'); },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.products() }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<Product, AxiosError<ApiError>, { id: number; data: UpdateProductData }, { previous: Product[] | undefined }>({
    mutationFn: async ({ id, data }) => { const { data: r } = await axiosInstance.put<{ data: Product }>(`/products/${id}`, data); return r.data; },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.products() });
      const previous = qc.getQueryData<Product[]>(inventoryKeys.products());
      qc.setQueryData<Product[]>(inventoryKeys.products(), (old) => (old ?? []).map((p) => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } as Product : p));
      return { previous };
    },
    onError: (e, _v, ctx) => { if (ctx?.previous) qc.setQueryData(inventoryKeys.products(), ctx.previous); showToast('error', e.response?.data?.message || 'Failed to update product'); },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.products() }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  return useMutation<void, AxiosError<ApiError>, number, { previous: Product[] | undefined }>({
    mutationFn: async (id) => { await axiosInstance.delete(`/products/${id}`); },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: inventoryKeys.products() });
      const previous = qc.getQueryData<Product[]>(inventoryKeys.products());
      qc.setQueryData<Product[]>(inventoryKeys.products(), (old) => (old ?? []).filter((p) => p.id !== id));
      return { previous };
    },
    onError: (e, _id, ctx) => {
      // 404 means product already gone from server — treat as success
      if (e.response?.status === 404) {
        qc.invalidateQueries({ queryKey: inventoryKeys.products() });
        return;
      }
      if (ctx?.previous) qc.setQueryData(inventoryKeys.products(), ctx.previous);
      showToast('error', e.response?.data?.message || 'Failed to delete product');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: inventoryKeys.products() }),
  });
}

/** ── Stock Movements ── */

export function useStockMovements() {
  return useQuery<StockMovement[]>({
    queryKey: inventoryKeys.stockMovements(),
    queryFn: async () => {
      const { data: response } = await axiosInstance.get<{ data: StockMovement[] }>('/stock-movements');
      return response.data;
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<StockMovement, AxiosError<ApiError>, CreateStockMovementData, { previousProducts: Product[] | undefined }>({
    mutationFn: async (payload) => {
      const { data: response } = await axiosInstance.post<{ data: StockMovement }>('/stock-movements', payload);
      return response.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.products() });
      const previousProducts = queryClient.getQueryData<Product[]>(inventoryKeys.products());
      queryClient.setQueryData<Product[]>(inventoryKeys.products(), (old) =>
        (old ?? []).map((p) => p.id === payload.product_id ? { ...p, stock_quantity: payload.stock_after } : p),
      );
      return { previousProducts };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previousProducts) queryClient.setQueryData(inventoryKeys.products(), ctx.previousProducts);
      showToast('error', error.response?.data?.message || 'Failed to record stock movement');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      // Invalidate product-specific stock movement history
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
  });
}
