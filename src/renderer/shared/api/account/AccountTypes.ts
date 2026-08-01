import type { AuthUser } from '../../../app/store/slices/authSlice';
import type { Plan } from '../../../shared/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  /** Simple account types — no business/workspace.
   *  `personal` buys modules à la carte; `storefront_buyer` is a free
   *  Discover-only shopping account (no dashboard, no subscription). */
  account_type?: 'personal' | 'storefront_buyer';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  active_plans?: Plan[];
}

export interface RegisterPersonalRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  account_type: 'personal';
  /** Optional module slugs to immediately subscribe to after registration. */
  modules?: string[];
}

export interface BusinessRegisterRequest {
  owner_name: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  privacy_consent?: boolean;
  plan_id: number;
  billing_cycle?: 'monthly' | 'yearly';
  referral_code?: string;
  currency?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
