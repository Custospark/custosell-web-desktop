import { store } from '../store';
import { updateShiftContext } from '../slices/authSlice';
import { mutationQueue } from './mutationQueue';
import { localShiftsStore, type ShiftRecord, type ShiftWithSyncMeta } from './localShiftsStore';
import { shouldCompleteMutationLocally } from './offlineQueryUtils';
import { persistAuthSnapshot } from './persistAuthSnapshot';
import { isLocalSessionToken } from './secureStorage';

export function shouldCompleteShiftLocally(): boolean {
  return shouldCompleteMutationLocally();
}

/** Local shift when offline, local auth session, or account pending sync. */
export function shouldUseLocalShiftActions(): boolean {
  if (shouldCompleteMutationLocally()) return true;
  const { auth } = store.getState();
  if (auth.isLocalSession || auth.pendingAuthSync) return true;
  return isLocalSessionToken(auth.token);
}

function buildLocalShift(): ShiftRecord {
  const now = new Date().toISOString();
  const authUser = store.getState().auth.user;
  const localId = -Date.now();

  return {
    id: localId,
    business_id: authUser?.business_id ?? 0,
    user_id: authUser?.id ?? 0,
    clock_in: now,
    clock_out: null,
    total_sales: '0',
    total_cash: '0',
    total_mobile_money: '0',
    total_card: '0',
    status: 'active',
    notes: null,
    created_at: now,
    updated_at: now,
  };
}

async function persistOfflineClockInInBackground(shift: ShiftRecord): Promise<void> {
  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'POST',
      url: '/shifts',
      data: { clock_in: shift.clock_in, status: 'active' },
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineShift] Clock-in enqueue failed:', err);
  }

  await localShiftsStore.saveOpen(shift, mutationId);
}

export async function completeOfflineClockIn(): Promise<ShiftWithSyncMeta> {
  const shift = buildLocalShift();

  store.dispatch(
    updateShiftContext({ shift_id: shift.id, shift_clock_in: shift.clock_in }),
  );
  await persistAuthSnapshot().catch(() => undefined);
  await persistOfflineClockInInBackground(shift);

  return { ...shift, _pendingSync: true };
}

/** @deprecated Use completeOfflineClockIn */
export function completeOfflineClockInInstant(): ShiftWithSyncMeta {
  const shift = buildLocalShift();
  store.dispatch(
    updateShiftContext({ shift_id: shift.id, shift_clock_in: shift.clock_in }),
  );
  void persistAuthSnapshot().catch(() => undefined);
  void persistOfflineClockInInBackground(shift).catch((err) => {
    console.error('[OfflineShift] Clock-in background persist failed:', err);
  });
  return { ...shift, _pendingSync: true };
}

async function persistOfflineClockOutInBackground(
  shiftId: number,
  shift: ShiftRecord,
  totals: Record<string, number>,
): Promise<void> {
  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'PUT',
      url: `/shifts/${shiftId}`,
      data: {
        clock_out: shift.clock_out,
        status: 'completed',
        total_sales: totals.total_sales,
        total_cash: totals.cash,
        total_mobile_money: totals.mobile_money,
        total_card: totals.card,
      },
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineShift] Clock-out enqueue failed:', err);
  }

  await localShiftsStore.saveClose(shift, mutationId);
}

export function completeOfflineClockOutInstant(
  shiftId: number,
  totals: Record<string, number>,
  currentShift: ShiftRecord | null,
): ShiftWithSyncMeta {
  const now = new Date().toISOString();
  const base = currentShift ?? buildLocalShift();
  const completed: ShiftRecord = {
    ...base,
    id: shiftId,
    clock_out: now,
    status: 'completed',
    total_sales: String(totals.total_sales),
    total_cash: String(totals.cash),
    total_mobile_money: String(totals.mobile_money),
    total_card: String(totals.card),
    updated_at: now,
  };

  store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
  void persistAuthSnapshot().catch(() => undefined);

  void persistOfflineClockOutInBackground(shiftId, completed, totals).catch((err) => {
    console.error('[OfflineShift] Clock-out background persist failed:', err);
  });

  return { ...completed, _pendingSync: true };
}
