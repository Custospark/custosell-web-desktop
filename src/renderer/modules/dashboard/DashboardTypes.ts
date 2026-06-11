export interface SalesTrendDay {
  date: string;
  revenue: number;
  refunds?: number;
  expenses?: number;
  net_after_refunds?: number;
  /** gross − refunds − expenses */
  net_sales?: number;
  /** @deprecated use net_sales */
  net_revenue?: number;
  transactions: number;
}

export interface LowStockProduct {
  id: number;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

export interface RecentSale {
  id: number;
  receipt_number: string;
  total_amount: number;
  refunds?: number;
  net_amount?: number;
  payment_method: string;
  created_at: string;
  items_count: number;
}

/** Today-only VAT metrics — included in dashboard summary when business is VAT-registered. */
export interface DashboardTodayVat {
  output_vat: number;
  output_vat_refunded: number;
  net_output_vat: number;
  input_vat: number;
  vat_payable: number;
  transaction_count: number;
}

export interface DashboardSummary {
  today_revenue: number;
  today_gross_sales: number;
  today_refunds: number;
  today_net_after_refunds: number;
  /** gross − refunds − expenses */
  today_net_sales: number;
  today_transactions: number;
  today_products_sold: number;
  today_expenses: number;
  /** @deprecated alias of today_net_sales */
  today_net_after_expenses: number;
  active_products: number;
  total_customers: number;
  sales_trend: SalesTrendDay[];
  low_stock: LowStockProduct[];
  recent_sales: RecentSale[];
  today_vat?: DashboardTodayVat | null;
}
