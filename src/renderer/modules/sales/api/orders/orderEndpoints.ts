export const ORDERS = {
  INDEX: '/orders',
  DETAIL: (id: number) => `/orders/${id}`,
  CANCEL: (id: number) => `/orders/${id}/cancel`,
} as const;
