export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  price_tier?: 'retail' | 'wholesale';
  discount_amount?: number;
  subtotal: number;
}

export interface Invoice {
  id: number;
  business_id: number;
  invoice_number: string;
  customer_id: number | null;
  sale_id?: number | null;
  estimate_id?: number | null;
  purchase_order_id?: number | null;
  buyer_business_id?: number | null;
  /** Source branch this invoice was created from. */
  location_id?: number | null;
  location?: { id: number; name: string; code: string | null } | null;
  /** issued = we sold; received = PO invoice from a supplier */
  direction?: 'issued' | 'received';
  /** Counterparty label from API (supplier when received, customer when issued). */
  party_name?: string | null;
  party_role?: 'supplier' | 'customer' | null;
  seller_business?: {
    id: number;
    name: string;
    description?: string | null;
    business_phone?: string | null;
    phone?: string | null;
    business_email?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    currency?: string | null;
    receipt_footer?: string | null;
  } | null;
  purchase_order?: { id: number; po_number: string; status: string } | null;
  customer?: { id: number; name: string; phone?: string; email?: string | null } | null;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'cancelled' | 'overdue';
  subtotal: number;
  discount_amount?: number;
  tax_total: number;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
  email_sent_count?: number;
  last_emailed_at?: string | null;
  items: InvoiceItem[];
  payments?: import('../../payments/paymentTypes').Payment[];
  /** URA EFRIS fiscalization - none when EFRIS off or not yet attempted. */
  fiscal_status?: 'none' | 'pending' | 'fiscalized' | 'failed';
  fiscal_fdn?: string | null;
  fiscal_qr?: string | null;
  fiscal_verification_code?: string | null;
  fiscalized_at?: string | null;
  fiscal_last_error?: string | null;
  created_at: string;
  updated_at?: string;
}
