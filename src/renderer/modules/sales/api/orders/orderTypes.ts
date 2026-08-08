import type { CartItem } from '../salesTypes';

export type OrderStatus = 'open' | 'completed' | 'invoiced' | 'cancelled';
export type OrderSource = 'pos' | 'storefront';

export interface PosOrderItem {
  id?: number;
  order_id?: number;
  product_id: number | null;
  product_name: string;
  product_price: number | string;
  /** Product's wholesale price when the line was sold at wholesale — persists the price tier across a hold. */
  wholesale_price?: number | string | null;
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
  delivery_address?: string | null;
  delivery_city?: string | null;
  shift_id: number | null;
  location_id?: number | null;
  location?: { id: number; name: string; code: string | null } | null;
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
  location_id?: number | null;
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
    wholesale_price?: number | null;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_amount?: number;
    subtotal?: number;
  }[];
}

export type UpdateOrderPayload = Partial<CreateOrderPayload>;

export function orderItemsToCartItems(items: PosOrderItem[] | undefined): CartItem[] {
  return (items ?? []).map((item) => {
    const unit_price = Number(item.unit_price);
    // Persisted wholesale price (backend-order_items.wholesale_price) wins over
    // price comparison — it records the tier at the moment the order was held.
    const wholesale = item.wholesale_price != null && Number(item.wholesale_price) > 0
      ? Number(item.wholesale_price)
      : null;
    const retail = Number(item.product_price ?? unit_price);
    return {
      product_id: item.product_id ?? 0,
      name: item.product_name,
      unit_price,
      quantity: item.quantity,
      discount_amount: Number(item.discount_amount ?? 0),
      price_tier: wholesale != null && unit_price <= wholesale ? 'wholesale' : 'retail',
      retail_price: retail,
      _wholesale_price: wholesale,
    };
  });
}

export function cartItemsToOrderItems(items: CartItem[]) {
  return items.map((item) => ({
    product_id: item.product_id,
    product_name: item.name,
    product_price: item.retail_price ?? item.unit_price,
    wholesale_price: item.price_tier === 'wholesale' ? item._wholesale_price : null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount ?? 0,
    subtotal: Math.max(0, item.unit_price * item.quantity - (item.discount_amount ?? 0)),
  }));
}
