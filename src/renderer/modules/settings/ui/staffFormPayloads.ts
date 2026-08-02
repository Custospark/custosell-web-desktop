import type { AttachStaffData, CreateStaffData, UpdateStaffData } from '../api/settings/StaffTypes';

export interface StaffPayloadBase {
  name: string;
  email: string;
  phone: string | null;
  roleId: number | null;
  locationId: number | null;
  modules?: string[];
}

export function buildUpdateStaffPayload(
  base: StaffPayloadBase & {
    currentLocationId: number | null;
    canChangeRole: boolean;
    currentRoleId: number | null;
    password?: string;
    passwordConfirmation?: string;
  },
): UpdateStaffData {
  const payload: UpdateStaffData = {
    name: base.name,
    email: base.email,
    phone: base.phone,
    role_id: base.canChangeRole ? base.roleId || base.currentRoleId || null : base.currentRoleId ?? null,
  };
  if (base.modules !== undefined) {
    payload.modules = base.modules;
  }
  if (base.password) {
    payload.password = base.password;
    if (base.passwordConfirmation) {
      payload.password_confirmation = base.passwordConfirmation;
    }
  }
  if (base.locationId != null && base.locationId !== base.currentLocationId) {
    payload.location_id = base.locationId;
    payload.location_ids = [base.locationId];
  }
  return payload;
}

export function buildCreateStaffPayload(
  base: StaffPayloadBase & {
    businessId: number | null;
    password: string;
    passwordConfirmation: string;
  },
): CreateStaffData {
  const payload: CreateStaffData = {
    business_id: base.businessId,
    name: base.name,
    email: base.email,
    phone: base.phone,
    password: base.password,
    password_confirmation: base.passwordConfirmation,
    role_id: base.roleId ?? 0,
    modules: base.modules,
  };
  if (base.locationId != null) {
    payload.location_id = base.locationId;
    payload.location_ids = [base.locationId];
  }
  return payload;
}

export function buildAttachStaffPayload(base: StaffPayloadBase): AttachStaffData {
  const payload: AttachStaffData = {
    email: base.email,
    role_id: base.roleId ?? 0,
    modules: base.modules,
    name: base.name.trim() || undefined,
    phone: base.phone,
  };
  if (base.locationId != null) {
    payload.location_id = base.locationId;
    payload.location_ids = [base.locationId];
  }
  return payload;
}
