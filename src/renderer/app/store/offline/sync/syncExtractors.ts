import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import { updateShiftContext } from '../../slices/authSlice';
import { persistAuthSnapshot } from '../auth/persistAuthSnapshot';
import { localStaffStore } from '../settings/localStaffStore';
import { localShiftsStore } from '../sales/localShiftsStore';
import { commitMutationQueueEntry } from './syncMutationFinalize';
import { invalidateAfterItemCommitted } from './syncCacheRefresh';
import type { QueuedMutation } from './mutationQueue';
import type { ShiftRecord } from '../sales/localShiftsStore';
import type { ExpenseCategory } from '../../../../modules/expenses/api/ExpenseTypes';
import type { Business } from '../../../../modules/settings/api/settings/BusinessTypes';
import type { Role } from '../../../../modules/settings/api/settings/RoleTypes';
import type { StaffUser } from '../../../../modules/settings/api/settings/StaffTypes';
import { isShiftCloseMutation, isStaffCreateMutation, extractShiftIdFromCloseUrl } from './syncMutators';

function extractId(responseData: unknown): { id: number } | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: { id: number } };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as { id: number };
  if ('id' in direct) return direct;
  return null;
}

export function extractCategory(responseData: unknown): { id: number } | null {
  return extractId(responseData);
}

export function extractOrder(responseData: unknown): { id: number } | null {
  return extractId(responseData);
}

export function extractExpenseCategory(responseData: unknown): ExpenseCategory | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: ExpenseCategory };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as ExpenseCategory;
  if ('id' in direct) return direct;
  return null;
}

export function extractRole(responseData: unknown): Role | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Role };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Role;
  if ('id' in direct) return direct;
  return null;
}

export function extractBusiness(responseData: unknown): Business | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: Business };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) return wrapped.data;
  const direct = responseData as Business;
  if ('id' in direct) return direct;
  return null;
}

export function extractShift(responseData: unknown): ShiftRecord | null {
  if (!responseData || typeof responseData !== 'object') return null;
  const wrapped = responseData as { data?: ShiftRecord };
  if (wrapped.data && typeof wrapped.data === 'object') return wrapped.data;
  return responseData as ShiftRecord;
}

async function findServerStaffByEmail(email: unknown): Promise<StaffUser | null> {
  if (typeof email !== 'string' || !email.trim()) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const response = await axiosInstance.get<{ data: StaffUser[] }>('/users', { skipAuthRedirect: true });
  return response.data.data
    .filter(Boolean)
    .find((staff) => staff.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function reconcileDuplicateStaffCreate(m: QueuedMutation, message: string): Promise<boolean> {
  if (!isStaffCreateMutation(m)) return false;
  if (!/email|duplicate|already|taken/i.test(message)) return false;

  const payload = m.data as { email?: unknown } | undefined;
  let serverStaff: StaffUser | null;
  try {
    serverStaff = await findServerStaffByEmail(payload?.email);
  } catch {
    return false;
  }
  if (!serverStaff) return false;

  await commitMutationQueueEntry(m.id);
  await localStaffStore.removeByMutationId(m.id);
  void invalidateAfterItemCommitted().catch(() => undefined);
  return true;
}

export async function reconcileDuplicateShiftClose(m: QueuedMutation, status?: number): Promise<boolean> {
  if (!isShiftCloseMutation(m)) return false;
  if (status !== 404) return false;

  await commitMutationQueueEntry(m.id);
  await localShiftsStore.removeByMutationId(m.id);
  const closedShiftId = extractShiftIdFromCloseUrl(m.url);
  if (closedShiftId) {
    store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
    void persistAuthSnapshot().catch(() => undefined);
  }
  void invalidateAfterItemCommitted().catch(() => undefined);
  return true;
}