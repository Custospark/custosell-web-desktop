import { axiosInstance, queryClient } from '../../api/axiosConfig';
import { store } from '../store';
import { updateShiftContext } from '../slices/authSlice';
import type { AuthUser } from '../slices/authSlice';
import { accountKeys } from '../../../shared/api/account/AccountQueries';
import { shiftKeys } from '../../../modules/shifts/ShiftQueries';
import { salesKeys } from '../../../modules/sales/api/salesQueries';
import { refreshAllServerCatalogSnapshots } from './catalogSnapshotRefresh';
import { persistAuthSnapshot } from './persistAuthSnapshot';
import { refreshStoredUserSnapshot } from './deviceCredentials';

interface ShiftPayload {
  id: number;
  clock_in: string;
  status: string;
}

function extractActiveShift(body: unknown): ShiftPayload | null {
  if (!body || typeof body !== 'object') return null;
  const wrapped = body as { data?: ShiftPayload };
  if (wrapped.data && typeof wrapped.data === 'object' && 'id' in wrapped.data) {
    return wrapped.data;
  }
  const direct = body as ShiftPayload;
  if ('id' in direct && 'clock_in' in direct) return direct;
  return null;
}

/** Pull active shift from server and align auth slice (post session upgrade). */
export async function refreshActiveShiftFromServer(): Promise<void> {
  try {
    const { data } = await axiosInstance.get('/shifts/active', { timeout: 10000 });
    const shift = extractActiveShift(data);
    if (shift?.status === 'active') {
      store.dispatch(
        updateShiftContext({ shift_id: shift.id, shift_clock_in: shift.clock_in }),
      );
      await persistAuthSnapshot().catch(() => undefined);
    }
  } catch (err) {
    console.warn('[Session] Active shift refresh failed:', err);
  }
}

/** Background refresh of client caches after local → server session upgrade. */
export async function postSessionUpgradeRefresh(user: AuthUser): Promise<void> {
  queryClient.setQueryData(accountKeys.profile(), user);

  try {
    if (user.email) {
      await refreshStoredUserSnapshot(user.email, user);
    }
  } catch (err) {
    console.warn('[Session] User snapshot refresh failed:', err);
  }

  void refreshAllServerCatalogSnapshots();
  void queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  void queryClient.invalidateQueries({ queryKey: salesKeys.all });
  await refreshActiveShiftFromServer();
}
