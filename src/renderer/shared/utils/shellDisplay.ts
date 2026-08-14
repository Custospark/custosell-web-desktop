import type { AuthUser } from '../../app/store/slices/authSlice';

/** Resolve the active business display name from auth + optional settings cache. */
export function resolveBusinessDisplayName(
  user: AuthUser | null | undefined,
  business?: { name?: string | null } | null,
): string | null {
  const fromUser = user?.business_name?.trim()
    || user?.business?.name?.trim()
    || null;
  if (fromUser) return fromUser;
  const fromBusiness = business?.name?.trim();
  return fromBusiness || null;
}

/** Resolve business logo path from settings cache or auth snapshot. */
export function resolveBusinessLogoPath(
  user: AuthUser | null | undefined,
  business?: { logo_path?: string | null } | null,
): string | null {
  const fromBusiness = business?.logo_path?.trim() || null;
  if (fromBusiness) return fromBusiness;
  return user?.business?.logo_path?.trim() || null;
}

/** Header-safe user label - first name on narrow screens, full name when space allows. */
export function resolveUserMenuLabel(name: string | null | undefined, compact = false): string {
  if (!name?.trim()) return 'Account';
  if (compact) {
    return name.trim().split(/\s+/)[0] || name.trim();
  }
  return name.trim();
}
