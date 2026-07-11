export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'fulfilled'
  | 'cancelled'
  | 'received';

/** Buyer-side POs that still need attention (not finished / cancelled / rejected). */
export const OPEN_PURCHASE_ORDER_STATUSES: readonly PurchaseOrderStatus[] = [
  'draft',
  'submitted',
  'accepted',
  'fulfilled',
];

export function isOpenPurchaseOrderStatus(status: PurchaseOrderStatus): boolean {
  return (OPEN_PURCHASE_ORDER_STATUSES as readonly string[]).includes(status);
}

export type PurchaseOrderPaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface PurchaseOrderInvoiceRef {
  id: number;
  invoice_number: string;
  status: string;
  amount_paid: string | number;
  total_amount: string | number;
  payments_count?: number | null;
  payment_status?: 'unpaid' | 'partial' | 'paid' | null;
}

export interface PurchaseOrderBusinessRef {
  id: number;
  name: string;
  supply_headline?: string | null;
  description?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string | null;
  unit_price: string | number;
  quantity: number;
  quantity_fulfilled: number;
  subtotal: string | number;
  received_product_id: number | null;
}

export interface PurchaseOrder {
  id: number;
  buyer_business_id: number;
  buyer_business?: PurchaseOrderBusinessRef | null;
  seller_business_id: number;
  seller_business?: PurchaseOrderBusinessRef | null;
  po_number: string;
  status: PurchaseOrderStatus;
  payment_status: PurchaseOrderPaymentStatus;
  subtotal: string | number;
  tax_total: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  notes: string | null;
  rejection_reason: string | null;
  invoice_id?: number | null;
  invoice?: PurchaseOrderInvoiceRef | null;
  items?: PurchaseOrderItem[];
  submitted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  fulfilled_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderPayload {
  seller_business_id: number;
  notes?: string | null;
  discount_amount?: number;
  tax_total?: number;
  items: { product_id: number; quantity: number }[];
}

export interface ReceivePurchaseOrderPayload {
  items: Array<
    | { id: number; product_id: number; create_product?: false }
    | { id: number; create_product: true; product_id?: never }
  >;
}
