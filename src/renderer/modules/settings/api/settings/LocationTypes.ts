export interface Location {
  id: number;
  business_id: number;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  is_default: boolean;
  is_active: boolean;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateLocationData {
  name?: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}
