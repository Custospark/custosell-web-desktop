export interface PayableEntity {
  type: 'sales_rep' | 'user';
  id: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  total_earned: number;
  total_paid: number;
  pending: number;
  payout_frequency: string | null;
  next_payout_at: string | null;
  last_payout_at: string | null;
  payment_method: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  mobile_money_name: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
}

export interface PayoutRecord {
  id: number;
  payable_type: string;
  payable_id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'scheduled' | 'cancelled';
  payment_method: string | null;
  notes: string | null;
  attachments: unknown[] | null;
  scheduled_at: string | null;
  paid_at: string | null;
  paid_by: number | null;
  paid_by_user?: { id: number; name: string } | null;
  created_at: string;
}
