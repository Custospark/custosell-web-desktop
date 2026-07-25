export interface ReferralEarnings {
  referral_code: string | null;
  total_earned: number;
  pending_rewards: number;
  rewarded_amount: number;
  total_referrals: number;
  active_referrals: number;
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
