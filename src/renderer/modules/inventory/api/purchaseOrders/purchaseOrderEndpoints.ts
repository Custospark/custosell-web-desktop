export const PURCHASE_ORDERS = {
  INDEX: '/purchase-orders',
  INCOMING: '/purchase-orders/incoming',
  DETAIL: (id: number) => `/purchase-orders/${id}`,
  UPDATE: (id: number) => `/purchase-orders/${id}`,
  SUBMIT: (id: number) => `/purchase-orders/${id}/submit`,
  CANCEL: (id: number) => `/purchase-orders/${id}/cancel`,
  DELETE: (id: number) => `/purchase-orders/${id}`,
  ACCEPT: (id: number) => `/purchase-orders/${id}/accept`,
  REJECT: (id: number) => `/purchase-orders/${id}/reject`,
  FULFILL: (id: number) => `/purchase-orders/${id}/fulfill`,
  RECEIVE: (id: number) => `/purchase-orders/${id}/receive`,
} as const;
