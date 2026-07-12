import type { CartItem } from '../salesTypes';

export type OrderStatus = 'open' | 'completed' | 'invoiced' | 'cancelled';
export type OrderSource = 'pos' | 'storefront';

export interface PosOrderItem {
  id?: number;
  order_id?: number;
  product_id: number | null;
  product_name: string;
  product_price: number | string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  tax_amount?: number | string;
  discount_amount?: number | string;
}

export interface PosOrder {
  id: number;
  business_id: number;
  user_id: number;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone?: string | null;
  shift_id: number | null;
  order_number: string;
  status: OrderStatus;
  source?: OrderSource | string;
  subtotal: number | string;
  tax_total: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  notes: string | null;
  sale_id: number | null;
  item_count?: number | null;
  items?: PosOrderItem[];
  held_at: string | null;
  created_at: string;
  updated_at: string;
  _pendingSync?: boolean;
  _localId?: string;
}

export interface CreateOrderPayload {
  customer_id?: number | null;
  customer_name?: string | null;
  shift_id?: number | null;
  notes?: string | null;
  subtotal?: number;
  tax_total?: number;
  discount_amount?: number;
  total_amount?: number;
  items: {
    product_id?: number | null;
    product_name?: string;
    product_price?: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_amount?: number;
    subtotal?: number;
  }[];
}

export type UpdateOrderPayload = Partial<CreateOrderPayload>;

export function orderItemsToCartItems(items: PosOrderItem[] | undefined): CartItem[] {
  return (items ?? []).map((item) => ({
    product_id: item.product_id ?? 0,
    name: item.product_name,
    unit_price: Number(item.unit_price),
    quantity: item.quantity,
    discount_amount: Number(item.discount_amount ?? 0),
  }));
}

export function cartItemsToOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    product_name: item.name,
    product_price: item.unit_price,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount ?? 0,
    subtotal: Math.max(0, item.unit_price * item.quantity - (item.discount_amount ?? 0)),
  }));
}
