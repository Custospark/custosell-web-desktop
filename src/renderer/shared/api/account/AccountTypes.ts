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
}

export interface AuthResponse {
  user: { data: AuthUser };
  token: string;
}

export interface BusinessRegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  business_name?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
