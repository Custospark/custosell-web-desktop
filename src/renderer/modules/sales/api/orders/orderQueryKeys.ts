/** Poll Sales → Orders list every 30s while that page is open. */
export const ORDER_LIST_POLL_MS = 30_000;

export const orderKeys = {
  all: ['orders'] as const,
  list: (filters?: { status?: string; q?: string; source?: string; location_id?: string }) => [
    ...orderKeys.all,
    'list',
    filters ?? {},
  ] as const,
  detail: (id: number) => [...orderKeys.all, 'detail', id] as const,
  open: () => [...orderKeys.all, 'open'] as const,
};
