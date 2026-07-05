export interface Payment {
  id: number;
  business_id: number;
  payable_type: 'invoice' | 'sale';
  payable_id: number;
  receipt_number: string;
  amount: number;
  amount_tendered?: number;
  change_given?: number | null;
  payment_method: string;
  balance_after: number;
  paid_at: string;
  notes?: string | null;
  attachment_path?: string | null;
  attachment_url?: string | null;
  recorded_by?: number | null;
  _pendingSync?: boolean;
}

export interface RecordPaymentPayload {
  amount: number;
  payment_method: string;
  notes?: string;
  amount_tendered?: number;
  change_given?: number;
  attachment?: File | null;
}

export interface RecordPaymentResult {
  invoice: import('../invoices/api/InvoiceTypes').Invoice;
  payment: Payment;
}

export interface RecordSalePaymentResult {
  sale: import('../sales/api/salesTypes').Sale;
  payment: Payment;
}
