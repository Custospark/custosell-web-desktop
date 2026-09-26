export interface FiscalCredential {
  id: number;
  business_id: number;
  location_id: number | null;
  location_name?: string | null;
  country: string;
  tin: string;
  device_no: string;
  branch_id: string | null;
  api_username: string;
  has_api_password: boolean;
  private_key_path: string | null;
  public_key_path: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FiscalCredentialFormState {
  location_id: number | '';
  country: string;
  tin: string;
  device_no: string;
  branch_id: string;
  api_username: string;
  api_password: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
}

export const emptyCredentialForm = (): FiscalCredentialFormState => ({
  location_id: '',
  country: 'UG',
  tin: '',
  device_no: '',
  branch_id: '',
  api_username: '',
  api_password: '',
  environment: 'sandbox',
  is_active: true,
});

export function formFromCredential(c: FiscalCredential): FiscalCredentialFormState {
  return {
    location_id: c.location_id ?? '',
    country: c.country || 'UG',
    tin: c.tin,
    device_no: c.device_no,
    branch_id: c.branch_id ?? '',
    api_username: c.api_username,
    api_password: '',
    environment: c.environment === 'production' ? 'production' : 'sandbox',
    is_active: c.is_active,
  };
}

/** Blank password on edit keeps the stored secret (backend drops empty values). */
export function payloadFromForm(
  form: FiscalCredentialFormState,
  isNew: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    location_id: form.location_id === '' ? null : form.location_id,
    country: form.country.trim().toUpperCase() || 'UG',
    tin: form.tin.trim(),
    device_no: form.device_no.trim(),
    branch_id: form.branch_id.trim() || null,
    api_username: form.api_username.trim(),
    environment: form.environment,
    is_active: form.is_active,
  };
  if (isNew || form.api_password !== '') {
    payload.api_password = form.api_password;
  }
  return payload;
}
