export interface ReferralEarnings {
  referral_code: string | null;
  is_sales_rep: boolean;
  commission_rate?: string | null;
  commission_type?: string | null;
  total_earned: number;
  pending_rewards: number;
  rewarded_amount: number;
  rewards_paid: number;
  commission_earned: number;
  commission_pending: number;
  commission_paid: number;
  total_referrals: number;
  active_referrals: number;
  available_credit: number;
  business_credit: number;
  user_credit: number;
  currency: string;
  referrals: ReferralRecord[];
}

export interface ReferralRecord {
  id: number;
  referral_code_id: number;
  subscription_id: number;
  referred_business_id: number;
  status: 'pending' | 'active' | 'rewarded';
  discount_applied: string | null;
  reward_amount: string | null;
  reward_paid: boolean;
  commission_earned: string | null;
  commission_paid: boolean;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  referred_business?: {
    id: number;
    name: string;
  };
}

export interface ApplyReferralPayload {
  referral_code: string;
}

export interface ApplyReferralResponse {
  message: string;
  referral: ReferralRecord;
}
