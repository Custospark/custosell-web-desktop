import type { AuthUser } from '../../../app/store/slices/authSlice';

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
  /** Discover shopper — no business; becomes customer of shops they order from. */
  account_type?: 'storefront_buyer';
}

export interface AuthResponse {
  user: { data: AuthUser };
  token: string;
}

export interface BusinessRegisterRequest {
  owner_name: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  privacy_consent?: boolean;
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
