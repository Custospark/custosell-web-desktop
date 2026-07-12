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
  payment_bank_name: string | null;
  payment_bank_account_name: string | null;
  payment_bank_account_number: string | null;
  payment_bank_branch: string | null;
  payment_mobile_money_provider: string | null;
  payment_mobile_money_account_name: string | null;
  payment_mobile_money_number: string | null;
  payment_instructions: string | null;
  logo_path: string | null;
  status: string;
  trial_ends_at: string | null;
  is_open_for_supply?: boolean;
  supply_headline?: string | null;
  storefront_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateSupplyProfileData {
  is_open_for_supply: boolean;
  supply_headline?: string | null;
}

export interface UpdateStorefrontProfileData {
  storefront_enabled: boolean;
  slug?: string;
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
  payment_bank_name?: string | null;
  payment_bank_account_name?: string | null;
  payment_bank_account_number?: string | null;
  payment_bank_branch?: string | null;
  payment_mobile_money_provider?: string | null;
  payment_mobile_money_account_name?: string | null;
  payment_mobile_money_number?: string | null;
  payment_instructions?: string | null;
}

export interface UpdateBusinessMutationInput {
  data: UpdateBusinessData;
  logoFile?: File;
}
