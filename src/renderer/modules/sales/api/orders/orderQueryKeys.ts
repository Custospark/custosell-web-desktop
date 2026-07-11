export const orderKeys = {
  all: ['orders'] as const,
  list: (filters?: { status?: string; q?: string }) => [...orderKeys.all, 'list', filters ?? {}] as const,
  detail: (id: number) => [...orderKeys.all, 'detail', id] as const,
  open: () => [...orderKeys.all, 'open'] as const,
};
