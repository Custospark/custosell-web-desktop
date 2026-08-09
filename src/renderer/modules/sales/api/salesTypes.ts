export type CartPriceTier = 'retail' | 'wholesale';

export interface CartItem {
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  unit?: string | null;
  /** Active price tier for this line — wholesale uses wholesale_price as unit_price. */
  price_tier: CartPriceTier;
  /** Fixed retail price captured at add time (so tier toggling offline is stable). */
  retail_price: number;
  /** Product's wholesale price when set; null otherwise (wholesale toggle hidden). */
  _wholesale_price: number | null;
  /** Service lines have no stock and never use retail/wholesale tiering. */
  is_service?: boolean;
  tax_percentage?: number | string | null;
  tax_class?: 'standard' | 'exempt' | 'zero_rated' | string | null;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  product_price: string;
  quantity: number;
  unit_price: string;
  /** Charged price tier for this line — 'wholesale' when sold at wholesale_price. */
  price_tier?: CartPriceTier;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  refunded_quantity: number;
  refunded_amount: string;
  tax_refunded_amount?: string;
}

export interface BusinessInfo {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  tax_regime?: string | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | string | null;
  prices_include_tax?: boolean | null;
  description: string | null;
  business_email: string | null;
  business_phone: string | null;
  timezone: string | null;
  business_type: string | null;
  currency: string;
  receipt_footer: string | null;
  logo_path: string | null;
  status: string;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
}

export interface Sale {
  id: number;
  business_id: number;
  user_id: number;
  user?: UserInfo;
  customer_id: number | null;
  shift_id: number | null;
  order_id?: number | null;
  location_id?: number | null;
  location?: { id: number; name: string; code: string } | null;
  business?: BusinessInfo;
  receipt_number: string;
  subtotal: string;
  tax_total: string;
  discount_amount: string;
  total_amount: string;
  refunds?: number | string;
  net_amount?: number | string;
  amount_tendered: string | null;
  change_given: string | null;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'other';
  payment_status: 'paid' | 'partially_paid' | 'partially_refunded' | 'refunded';
  amount_paid?: string | number;
  balance_due?: number;
  notes: string | null;
  sale_date: string;
  customer?: { id: number; name: string; phone?: string; email?: string | null };
  sale_items?: SaleItem[];
  payments?: import('../../payments/paymentTypes').Payment[];
  email_sent_count?: number;
  /** URA EFRIS fiscalization — none when EFRIS off or not yet attempted. */
  fiscal_status?: 'none' | 'pending' | 'fiscalized' | 'failed';
  fiscal_fdn?: string | null;
  fiscal_qr?: string | null;
  fiscal_verification_code?: string | null;
  fiscalized_at?: string | null;
  fiscal_last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSalePayload {
  items: { product_id: number; quantity: number; unit_price: number; price_tier?: CartPriceTier; discount_amount?: number }[];
  subtotal: number;
  tax_total?: number;
  discount_amount?: number;
  total_amount: number;
  amount_tendered?: number | null;
  amount_paid?: number | null;
  change_given?: number | null;
  shift_id?: number | null;
  order_id?: number | null;
  location_id?: number | null;
  payment_method: 'cash' | 'mobile_money' | 'card' | 'other';
  customer_id?: number | null;
  notes?: string | null;
}

export interface RefundData {
  items: { id: number; quantity: number; amount?: number }[];
}

export interface SalesState {
  cartItems: CartItem[];
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'other';
  customerId: number | null;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  amountTendered: number;
  /** Open order linked to the cart (sale completion or explicit update). */
  activeOrderId: number | null;
  /**
   * How the cart is linked to activeOrderId:
   * - `sale` — resumed to complete a sale (order_id on checkout)
   * - `update` — user chose Update on an order (explicit PUT save)
   * - null — no order edit session
   */
  activeOrderMode: 'sale' | 'update' | null;
}
