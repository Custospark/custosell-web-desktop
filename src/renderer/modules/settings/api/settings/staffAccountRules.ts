import type { StaffUser } from './StaffTypes';

export const SELF_DELETE_STAFF_MESSAGE = 'You cannot delete your own account.';
export const OWNER_DELETE_STAFF_MESSAGE = 'The business owner account cannot be deleted.';
export const SELF_DEACTIVATE_STAFF_MESSAGE = 'You cannot deactivate your own account.';
export const OWNER_DEACTIVATE_STAFF_MESSAGE = 'The business owner account cannot be deactivated.';
export const SELF_ROLE_CHANGE_STAFF_MESSAGE = 'You cannot change your own role.';
export const OWNER_ROLE_CHANGE_STAFF_MESSAGE = 'The business owner account role cannot be changed.';
export const SYSTEM_ROLE_CHANGE_STAFF_MESSAGE = 'Admin and system account roles cannot be changed here.';

type StaffAccountRole = {
  id?: number;
  name?: string | null;
  slug?: string | null;
} | null | undefined;

export type StaffAccountContext = {
  currentUserId?: number | null;
  businessOwnerId?: number | null;
};

export type StaffAccountRuleSummary = {
  isCurrentUser: boolean;
  isBusinessOwner: boolean;
  isAdmin: boolean;
  labels: string[];
  canDelete: boolean;
  deleteBlockedReason: string | null;
  canDeactivate: boolean;
  deactivationBlockedReason: string | null;
  canChangeRole: boolean;
  roleChangeBlockedReason: string | null;
};

function toComparableId(id: number | null | undefined): number | null {
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

export function getRoleSlug(role: StaffAccountRole): string | null {
  return role?.slug?.trim().toLowerCase() || null;
}

export function isAdminRole(role: StaffAccountRole): boolean {
  return getRoleSlug(role) === 'admin' || role?.name?.trim().toLowerCase() === 'admin';
}

export function isSystemRole(role: StaffAccountRole): boolean {
  const slug = getRoleSlug(role);
  const name = role?.name?.trim().toLowerCase() || null;
  return ['admin', 'owner', 'business-owner', 'business_owner', 'system', 'super-admin', 'super_admin']
    .includes(slug ?? name ?? '');
}

export function getBusinessOwnerId(
  business: { owner_id?: number | null; created_at?: string | null; updated_at?: string | null } | null | undefined,
  options: { ignoreAuthFallbackForUserId?: number | null } = {},
): number | null {
  const ownerId = toComparableId(business?.owner_id);
  const authFallbackUserId = toComparableId(options.ignoreAuthFallbackForUserId);
  const looksLikeAuthFallback =
    ownerId !== null &&
    authFallbackUserId !== null &&
    ownerId === authFallbackUserId &&
    business?.created_at === '' &&
    business?.updated_at === '';

  return looksLikeAuthFallback ? null : ownerId;
}

export function isCurrentStaffUser(staffId: number, currentUserId: number | null | undefined): boolean {
  const safeStaffId = toComparableId(staffId);
  const safeCurrentUserId = toComparableId(currentUserId);
  return safeStaffId !== null && safeStaffId === safeCurrentUserId;
}

export function isBusinessOwnerStaff(staffId: number, businessOwnerId: number | null | undefined): boolean {
  const safeStaffId = toComparableId(staffId);
  const safeBusinessOwnerId = toComparableId(businessOwnerId);
  return safeStaffId !== null && safeStaffId === safeBusinessOwnerId;
}

export function getStaffAccountRules(
  staff: Pick<StaffUser, 'id'> & { role?: StaffAccountRole },
  context: StaffAccountContext,
): StaffAccountRuleSummary {
  const isCurrentUser = isCurrentStaffUser(staff.id, context.currentUserId);
  const isBusinessOwner = isBusinessOwnerStaff(staff.id, context.businessOwnerId);
  const isAdmin = isAdminRole(staff.role);
  const isSystem = isSystemRole(staff.role);
  const labels = [
    isCurrentUser ? 'You' : null,
    isBusinessOwner ? 'Business Owner' : null,
    isAdmin && !isBusinessOwner ? 'Admin' : null,
  ].filter(Boolean) as string[];

  const deleteBlockedReason = isCurrentUser
    ? SELF_DELETE_STAFF_MESSAGE
    : isBusinessOwner
      ? OWNER_DELETE_STAFF_MESSAGE
      : null;
  const deactivationBlockedReason = isCurrentUser
    ? SELF_DEACTIVATE_STAFF_MESSAGE
    : isBusinessOwner
      ? OWNER_DEACTIVATE_STAFF_MESSAGE
      : null;
  const roleChangeBlockedReason = isCurrentUser
    ? SELF_ROLE_CHANGE_STAFF_MESSAGE
    : isBusinessOwner
      ? OWNER_ROLE_CHANGE_STAFF_MESSAGE
      : isSystem
        ? SYSTEM_ROLE_CHANGE_STAFF_MESSAGE
        : null;

  return {
    isCurrentUser,
    isBusinessOwner,
    isAdmin,
    labels,
    canDelete: !deleteBlockedReason,
    deleteBlockedReason,
    canDeactivate: !deactivationBlockedReason,
    deactivationBlockedReason,
    canChangeRole: !roleChangeBlockedReason,
    roleChangeBlockedReason,
  };
}

export function assertCanDeleteStaffAccount(staffId: number, context: StaffAccountContext): void {
  const rules = getStaffAccountRules({ id: staffId }, context);
  if (!rules.canDelete) {
    throw new Error(rules.deleteBlockedReason ?? 'This staff account cannot be deleted.');
  }
}
