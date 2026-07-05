export interface Customer {
  id: number;
  business_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  total_purchases: string;
  last_purchase_at: string | null;
}

export interface CreateCustomerData {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export type UpdateCustomerData = Partial<CreateCustomerData>;

export interface CustomerPurchase {
  id: number;
  receipt_number: string;
  sale_date: string;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  sale_items?: { id: number; product_name: string; quantity: number; unit_price: string; subtotal: string }[];
}
