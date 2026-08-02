export interface StaffBranchRef {
  id: number;
  name: string;
  code?: string | null;
  is_default?: boolean;
}

export interface StaffUser {
  id: number;
  business_id: number;
  role_id: number | null;
  location_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  modules?: string[];
  avatar?: string | null;
  role?: { id: number; name: string; slug?: string | null } | null;
  location?: StaffBranchRef | null;
  locations?: StaffBranchRef[] | null;
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
  location_id?: number | null;
  location_ids?: number[];
  modules?: string[];
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  phone?: string | null;
  password?: string;
  password_confirmation?: string;
  role_id?: number | null;
  location_id?: number | null;
  location_ids?: number[];
  modules?: string[];
}

export interface AttachStaffData {
  email: string;
  role_id: number;
  location_id?: number | null;
  location_ids?: number[];
  modules?: string[];
  name?: string;
  phone?: string | null;
}

export type StaffLookupStatus =
  | 'available'
  | 'unattached'
  | 'already_member'
  | 'other_business'
  | 'soft_deleted'
  | 'platform_inactive';

export interface StaffLookupUser {
  id: number;
  name: string;
  email: string;
}

export interface StaffLookupResult {
  status: StaffLookupStatus;
  user?: StaffLookupUser;
}

export interface StaffTransferBranch {
  id: number;
  name: string;
}

export interface StaffTransferUser {
  id: number;
  name: string;
  email: string;
}

export interface StaffTransfer {
  id: number;
  business_id: number;
  user_id: number;
  user?: StaffTransferUser | null;
  from_location_id: number | null;
  from_location?: StaffTransferBranch | null;
  to_location_id: number;
  to_location?: StaffTransferBranch | null;
  transferred_by: number | null;
  transferred_by_user?: { id: number; name: string } | null;
  transfer_type: 'permanent' | 'temporary';
  status: 'pending' | 'completed' | 'cancelled';
  approval_required: boolean;
  approved_by: number | null;
  approved_by_user?: { id: number; name: string } | null;
  approved_at: string | null;
  effective_at: string | null;
  end_at: string | null;
  reason: string | null;
  notes: string | null;
  old_role_id: number | null;
  new_role_id: number | null;
  old_shift_id: number | null;
  new_shift_id: number | null;
  old_salary: string | null;
  new_salary: string | null;
  old_employment_type: string | null;
  new_employment_type: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffTransferData {
  user_id: number;
  from_location_id?: number | null;
  to_location_id: number;
  transfer_type?: 'permanent' | 'temporary';
  status?: 'pending' | 'completed' | 'cancelled';
  approval_required?: boolean;
  effective_at?: string | null;
  end_at?: string | null;
  reason?: string | null;
  notes?: string | null;
  new_role_id?: number | null;
  meta?: Record<string, unknown> | null;
}
