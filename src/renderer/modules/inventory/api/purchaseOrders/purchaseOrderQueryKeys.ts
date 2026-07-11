export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (filters?: { status?: string }) => [...purchaseOrderKeys.all, 'list', filters ?? {}] as const,
  incoming: (filters?: { status?: string }) => [...purchaseOrderKeys.all, 'incoming', filters ?? {}] as const,
  detail: (id: number) => [...purchaseOrderKeys.all, 'detail', id] as const,
};
