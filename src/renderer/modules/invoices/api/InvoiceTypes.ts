export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Invoice {
  id: number;
  business_id: number;
  invoice_number: string;
  customer_id: number | null;
  sale_id?: number | null;
  customer?: { id: number; name: string; phone?: string } | null;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'cancelled' | 'overdue';
  subtotal: number;
  tax_total: number;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
  items: InvoiceItem[];
  payments?: import('../../payments/paymentTypes').Payment[];
  created_at: string;
}
