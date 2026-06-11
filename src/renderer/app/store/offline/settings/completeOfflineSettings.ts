import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { setBusiness } from '../../slices/authSlice';
import { businessToAuthInfo } from '../../../../modules/settings/api/settings/businessAuthSync';
import { mutationQueue } from '../sync/mutationQueue';
import { isNetworkFailure, isOfflineMode, shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { requestSyncWhenOnline } from '../sync/syncPendingIfOnline';
import { localRolesStore, toRoleWithSyncMeta, type RoleWithSyncMeta } from './localRolesStore';
import { localStaffStore, toStaffWithSyncMeta, type StaffWithSyncMeta } from './localStaffStore';
import { localBusinessSettingsStore, type BusinessWithSyncMeta } from './localBusinessSettingsStore';
import type { Business, UpdateBusinessData } from '../../../../modules/settings/api/settings/BusinessTypes';
import type { CreateRoleData, Role, UpdateRoleData } from '../../../../modules/settings/api/settings/RoleTypes';
import { rolePermissionKeys } from '../../../../modules/settings/api/settings/RoleTypes';
import type { CreateStaffData, StaffUser, UpdateStaffData } from '../../../../modules/settings/api/settings/StaffTypes';
import { USERS } from '../../../../shared/api/endpoints/endpoints';

function newLocalNumericId(): number {
  return -Math.floor(Date.now() + Math.random() * 1000);
}

function triggerSettingsSyncAfterPersist(): void {
  requestSyncWhenOnline();
}

export function shouldCompleteSettingsLocally(): boolean {
  return shouldCompleteMutationLocally();
}

function extractServerErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const validationError = axiosErr.response?.data?.errors
    ? Object.values(axiosErr.response.data.errors).flat()[0]
    : null;
  return validationError || axiosErr.response?.data?.message || (err instanceof Error ? err.message : 'Sync failed');
}

export function buildLocalRole(payload: CreateRoleData): RoleWithSyncMeta {
  const now = new Date().toISOString();
  const authUser = store.getState().auth.user;
  const role: Role = {
    id: newLocalNumericId(),
    business_id: authUser?.business_id ?? 0,
    name: payload.name,
    slug: payload.slug,
    description: payload.description ?? null,
    permissions: payload.permissions,
    is_default: payload.is_default ?? false,
    created_at: now,
    updated_at: now,
  };

  return { ...role, _pendingSync: true };
}

export async function persistOfflineRoleInBackground(
  role: RoleWithSyncMeta,
  payload: CreateRoleData | UpdateRoleData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/roles';

  if (mutationType === 'update') {
    method = 'PUT';
    url = `/roles/${role.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/roles/${(payload as { id: number }).id}`;
  }

  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineSettings] Role enqueue failed:', err);
  }

  if (!mutationId) return;

  try {
    const localId = await localRolesStore.save(role, payload, mutationId, mutationType);
    role._localId = localId;
    triggerSettingsSyncAfterPersist();
  } catch (err) {
    console.error('[OfflineSettings] Role local save failed:', err);
  }
}

export function completeOfflineCreateRoleInstant(payload: CreateRoleData): RoleWithSyncMeta {
  const role = buildLocalRole(payload);
  void persistOfflineRoleInBackground(role, payload, 'create').catch((err) => {
    console.error('[OfflineSettings] Role persist failed:', err);
  });
  return role;
}

export function completeOfflineUpdateRoleInstant(role: Role, payload: UpdateRoleData): RoleWithSyncMeta {
  const updated: RoleWithSyncMeta = {
    ...role,
    ...payload,
    description: payload.description ?? role.description,
    permissions: payload.permissions ?? role.permissions,
    is_default: payload.is_default ?? role.is_default,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  void persistOfflineRoleInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineSettings] Role persist failed:', err);
  });
  return updated;
}

export async function completeOfflineUpdatePendingRoleInstant(
  existing: RoleWithSyncMeta,
  payload: UpdateRoleData,
): Promise<RoleWithSyncMeta> {
  const record = existing._localId
    ? await localRolesStore.getByLocalId(existing._localId)
    : await localRolesStore.getByRoleId(existing.id);
  if (!record) {
    throw new Error('Pending role record not found');
  }

  const updated: Role = {
    ...record.role,
    ...existing,
    ...payload,
    description: 'description' in payload ? payload.description ?? null : existing.description,
    permissions: payload.permissions ?? existing.permissions,
    is_default: payload.is_default ?? existing.is_default,
    updated_at: new Date().toISOString(),
  };
  const permissionKeys = rolePermissionKeys(updated.permissions);
  const nextPayload: CreateRoleData | UpdateRoleData =
    record.mutationType === 'create'
      ? {
          ...(record.payload as CreateRoleData),
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
          permissions: permissionKeys,
          is_default: updated.is_default,
        }
      : { ...(record.payload as UpdateRoleData), ...payload, permissions: payload.permissions ? permissionKeys : undefined };

  await mutationQueue.updateMutation(record.mutationId, { data: nextPayload });
  const updatedRecord = await localRolesStore.updatePendingRecord(record.localId, updated, nextPayload);
  await mutationQueue.requeue(record.mutationId);
  triggerSettingsSyncAfterPersist();

  return toRoleWithSyncMeta(updatedRecord);
}

export function completeOfflineDeleteRoleInstant(id: number): void {
  const role: RoleWithSyncMeta = {
    id,
    business_id: 0,
    name: '',
    slug: '',
    description: null,
    permissions: [],
    is_default: false,
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  void persistOfflineRoleInBackground(role, { id }, 'delete').catch((err) => {
    console.error('[OfflineSettings] Role persist failed:', err);
  });
}

export function buildLocalStaff(payload: CreateStaffData, role?: { id: number; name: string } | null): StaffWithSyncMeta {
  const now = new Date().toISOString();
  const authUser = store.getState().auth.user;
  const staff: StaffUser = {
    id: newLocalNumericId(),
    business_id: authUser?.business_id ?? payload.business_id ?? 0,
    role_id: payload.role_id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? null,
    is_active: true,
    role: role ?? null,
    created_at: now,
    updated_at: now,
  };

  return { ...staff, _pendingSync: true };
}

export async function persistOfflineStaffInBackground(
  staff: StaffWithSyncMeta,
  payload: CreateStaffData | UpdateStaffData | { id: number },
  mutationType: 'create' | 'update' | 'delete',
): Promise<void> {
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let url = '/users';

  if (mutationType === 'update') {
    method = 'PUT';
    url = `/users/${staff.id}`;
  } else if (mutationType === 'delete') {
    method = 'DELETE';
    url = `/users/${(payload as { id: number }).id}`;
  }

  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method,
      url,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineSettings] Staff enqueue failed:', err);
  }

  if (!mutationId) return;

  try {
    const localId = await localStaffStore.save(staff, payload, mutationId, mutationType);
    staff._localId = localId;
    triggerSettingsSyncAfterPersist();
  } catch (err) {
    console.error('[OfflineSettings] Staff local save failed:', err);
  }
}

export function completeOfflineCreateStaffInstant(
  payload: CreateStaffData,
  role?: { id: number; name: string } | null,
): StaffWithSyncMeta {
  const staff = buildLocalStaff(payload, role);
  void persistOfflineStaffInBackground(staff, payload, 'create').catch((err) => {
    console.error('[OfflineSettings] Staff persist failed:', err);
  });
  return staff;
}

export function completeOfflineUpdateStaffInstant(
  staff: StaffUser,
  payload: UpdateStaffData,
  role?: { id: number; name: string } | null,
): StaffWithSyncMeta {
  const updated: StaffWithSyncMeta = {
    ...staff,
    ...payload,
    phone: payload.phone ?? staff.phone,
    role_id: payload.role_id ?? staff.role_id,
    role: role ?? staff.role ?? null,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };
  void persistOfflineStaffInBackground(updated, payload, 'update').catch((err) => {
    console.error('[OfflineSettings] Staff persist failed:', err);
  });
  return updated;
}

export async function completeOfflineUpdatePendingStaffInstant(
  existing: StaffWithSyncMeta,
  payload: UpdateStaffData,
  role?: { id: number; name: string } | null,
): Promise<StaffWithSyncMeta> {
  const record = existing._localId
    ? await localStaffStore.getByLocalId(existing._localId)
    : await localStaffStore.getByStaffId(existing.id);
  if (!record) {
    throw new Error('Pending staff record not found');
  }

  const updated: StaffUser = {
    ...record.staff,
    ...existing,
    ...payload,
    phone: 'phone' in payload ? payload.phone ?? null : existing.phone,
    role_id: payload.role_id ?? existing.role_id,
    role: role ?? existing.role ?? null,
    is_active: payload.is_active ?? existing.is_active,
    updated_at: new Date().toISOString(),
  };
  const nextPayload: CreateStaffData | UpdateStaffData =
    record.mutationType === 'create'
      ? {
          ...(record.payload as CreateStaffData),
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          password: payload.password ?? (record.payload as CreateStaffData).password,
          password_confirmation:
            payload.password_confirmation ?? (record.payload as CreateStaffData).password_confirmation,
          role_id: updated.role_id,
        }
      : { ...(record.payload as UpdateStaffData), ...payload };

  if (!isOfflineMode()) {
    try {
      const { data } = record.mutationType === 'create'
        ? await axiosInstance.post<{ data: StaffUser }>(USERS.BASE, nextPayload)
        : await axiosInstance.put<{ data: StaffUser }>(USERS.BY_ID(existing.id), nextPayload);

      await localStaffStore.removeByMutationId(record.mutationId);
      await mutationQueue.removeById(record.mutationId);
      return data.data as StaffWithSyncMeta;
    } catch (err: unknown) {
      if (!isNetworkFailure(err)) {
        await localStaffStore.markFailedByMutationId(record.mutationId, extractServerErrorMessage(err));
      }
      throw err;
    }
  }

  await mutationQueue.updateMutation(record.mutationId, { data: nextPayload });
  const updatedRecord = await localStaffStore.updatePendingRecord(record.localId, updated, nextPayload);
  await mutationQueue.requeue(record.mutationId);
  triggerSettingsSyncAfterPersist();

  return toStaffWithSyncMeta(updatedRecord);
}

export function completeOfflineDeleteStaffInstant(id: number): void {
  const staff: StaffWithSyncMeta = {
    id,
    business_id: 0,
    role_id: 0,
    name: '',
    email: '',
    phone: null,
    is_active: false,
    role: null,
    created_at: '',
    updated_at: '',
    _pendingSync: true,
  };
  void persistOfflineStaffInBackground(staff, { id }, 'delete').catch((err) => {
    console.error('[OfflineSettings] Staff persist failed:', err);
  });
}

export async function persistOfflineBusinessInBackground(
  business: BusinessWithSyncMeta,
  payload: UpdateBusinessData,
): Promise<void> {
  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'PUT',
      url: '/businesses/profile',
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineSettings] Business enqueue failed:', err);
  }

  if (!mutationId) return;

  try {
    const localId = await localBusinessSettingsStore.save(business, payload, mutationId, 'update');
    business._localId = localId;
    triggerSettingsSyncAfterPersist();
  } catch (err) {
    console.error('[OfflineSettings] Business local save failed:', err);
  }
}

export function completeOfflineUpdateBusinessInstant(
  business: Business,
  payload: UpdateBusinessData,
): BusinessWithSyncMeta {
  const updated: BusinessWithSyncMeta = {
    ...business,
    ...payload,
    updated_at: new Date().toISOString(),
    _pendingSync: true,
  };

  store.dispatch(setBusiness(businessToAuthInfo(updated)));
  queryClient.setQueryData(['business', 'mine'], updated);
  void persistOfflineBusinessInBackground(updated, payload).catch((err) => {
    console.error('[OfflineSettings] Business persist failed:', err);
  });

  return updated;
}
