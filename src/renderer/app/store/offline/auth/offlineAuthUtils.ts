import { PERMISSIONS } from '../../../../modules/settings/api/settings/RoleTypes';
import type { AuthUser, BusinessInfo } from '../../slices/authSlice';
import type { BusinessRegisterRequest } from '../../../../shared/api/account/AccountTypes';
import { BUSINESS_MODULE_SLUGS } from '../../../../shared/utils/moduleAccess';

export function buildOwnerPermissions(): Record<string, boolean> {
  return PERMISSIONS.reduce<Record<string, boolean>>((acc, perm) => {
    acc[perm] = true;
    return acc;
  }, {});
}

function slugifyBusinessName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'business';
}

export function buildOfflineBusinessInfo(
  payload: BusinessRegisterRequest,
  localBusinessId: number,
  localUserId: number,
): BusinessInfo {
  return {
    id: localBusinessId,
    name: payload.name,
    slug: slugifyBusinessName(payload.name),
    email: payload.email,
    phone: payload.phone ?? null,
    website: null,
    address: null,
    city: null,
    state: null,
    postal_code: null,
    country: null,
    tax_id: null,
    tax_regime: 'none',
    jurisdiction: 'UG',
    default_vat_rate: 18,
    prices_include_tax: true,
    description: null,
    business_email: null,
    business_phone: null,
    timezone: null,
    business_type: null,
    currency: null,
    receipt_footer: null,
    logo_path: null,
    status: 'active',
    owner_id: localUserId,
  };
}

export function buildOfflineAuthUser(
  payload: BusinessRegisterRequest,
  localBusinessId: number,
  localUserId: number,
): AuthUser {
  const business = buildOfflineBusinessInfo(payload, localBusinessId, localUserId);
  return {
    id: localUserId,
    business_id: localBusinessId,
    role_id: -1,
    name: payload.owner_name,
    email: payload.email,
    phone: payload.phone ?? null,
    is_active: true,
    business_name: payload.name,
    business,
    shift_clock_in: null,
    shift_id: null,
    role: {
      id: -1,
      name: 'Owner',
      slug: 'owner',
      permissions: buildOwnerPermissions(),
    },
    is_business_owner: true,
    modules: [...BUSINESS_MODULE_SLUGS],
    accessible_modules: [...BUSINESS_MODULE_SLUGS, 'account', 'guide'],
  };
}

export function createLocalSessionToken(): string {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `local_${id}`;
}
