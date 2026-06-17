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
  tax_regime?: 'none' | 'vat_registered' | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | null;
  prices_include_tax?: boolean | null;
  description: string | null;
  business_email: string | null;
  business_phone: string | null;
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
  tax_regime?: 'none' | 'vat_registered' | null;
  jurisdiction?: string | null;
  default_vat_rate?: number | null;
  prices_include_tax?: boolean | null;
  description?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  timezone?: string | null;
  business_type?: string | null;
  currency?: string | null;
  receipt_footer?: string | null;
}
