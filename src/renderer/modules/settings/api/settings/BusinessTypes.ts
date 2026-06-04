export interface Business {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  timezone: string | null;
  business_type: string | null;
  currency: string | null;
  receipt_footer: string | null;
  logo_path: string | null;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBusinessData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  timezone?: string | null;
  business_type?: string | null;
  currency?: string | null;
  receipt_footer?: string | null;
}
