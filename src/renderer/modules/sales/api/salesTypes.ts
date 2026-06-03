export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  product_price: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  refunded_quantity: number;
  refunded_amount: string;
}

export interface Sale {
  id: number;
  business_id: number;
  user_id: number;
  customer_id: number | null;
  shift_id: number | null;
  receipt_number: string;
  subtotal: string;
  tax_total: string;
  discount_amount: string;
  total_amount: string;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'other';
  payment_status: 'paid' | 'partially_refunded' | 'refunded';
  notes: string | null;
  sale_date: string;
  items?: SaleItem[];
  customer?: { data: { id: number; name: string } };
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
}

export interface CreateSaleData {
  items: { product_id: number; quantity: number; unit_price: number; discount_amount?: number }[];
  subtotal: number;
  tax_total?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'other';
  customer_id?: number | null;
  notes?: string | null;
}

export interface RefundData {
  items: { id: number; quantity: number; amount?: number }[];
}
