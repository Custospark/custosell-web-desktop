export interface StaffUser {
  id: number;
  business_id: number;
  role_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  modules?: string[];
  role?: { id: number; name: string; slug?: string | null } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffData {
  business_id: number | null;
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  password_confirmation: string;
  role_id: number;
  modules?: string[];
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  phone?: string | null;
  password?: string;
  password_confirmation?: string;
  role_id?: number | null;
  is_active?: boolean;
  modules?: string[];
}
