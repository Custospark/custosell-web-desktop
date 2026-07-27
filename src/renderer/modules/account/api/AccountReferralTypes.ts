export interface PaymentInfo {
  payment_method: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
}

export interface PaymentInfoPayload {
  payment_method?: string;
  mobile_money_provider?: string;
  mobile_money_number?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
}

export interface PayoutAttachment {
  path: string;
  original_name: string;
  mime_type: string;
  size: number;
  file_url?: string | null;
}

export interface PayoutRecord {
  id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'scheduled' | 'cancelled';
  payment_method: string | null;
  notes: string | null;
  attachments: PayoutAttachment[] | null;
  scheduled_at: string | null;
  paid_at: string | null;
  paid_by_user: { id: number; name: string } | null;
  created_at: string;
}
