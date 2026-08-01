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

export interface CustomerSegment {
  key: 'active' | 'at_risk' | 'lapsed' | 'never';
  label: string;
  count: number;
}

export interface CustomerFrequencyBucket {
  bucket: string;
  count: number;
}

export interface CustomerMonthTrend {
  month: string;
  count?: number;
  revenue?: number;
}

export interface TopCustomer {
  id: number;
  name: string;
  total_purchases: number;
  purchase_count: number;
  last_purchase_at: string | null;
}

export interface CustomerOverviewData {
  total_customers: number;
  active_customers: number;
  repeat_customers: number;
  repeat_rate: number;
  total_revenue: number;
  average_value: number;
  segments: CustomerSegment[];
  frequency: CustomerFrequencyBucket[];
  new_customers_by_month: CustomerMonthTrend[];
  revenue_by_month: CustomerMonthTrend[];
  top_customers: TopCustomer[];
}
