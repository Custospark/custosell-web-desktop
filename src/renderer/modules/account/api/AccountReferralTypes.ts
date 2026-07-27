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

export interface PayoutRecord {
  id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'scheduled' | 'cancelled';
  payment_method: string | null;
  notes: string | null;
  scheduled_at: string | null;
  paid_at: string | null;
  paid_by_user: { id: number; name: string } | null;
  created_at: string;
}
