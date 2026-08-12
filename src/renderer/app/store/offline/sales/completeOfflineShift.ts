import { store } from '../../store';
import { updateShiftContext } from '../../slices/authSlice';
import { mutationQueue } from '../sync/mutationQueue';
import { trackWrite } from '../core/offlineWriteTracker';
import { localShiftsStore, type ShiftRecord, type ShiftWithSyncMeta } from './localShiftsStore';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { persistAuthSnapshot } from '../auth/persistAuthSnapshot';
import { isLocalSessionToken } from '../auth/secureStorage';
import { getOfflineDb } from '../core/offlineDb';

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

/** Drop queued shift open/close mutations once the shift is closed on the server. */
export async function discardPendingShiftMutations(shiftId: number): Promise<void> {
  const shiftIds = new Set<number>([shiftId]);

  const pendingRecords = await localShiftsStore.getPending();
  for (const record of pendingRecords) {
    if (record.shiftId === shiftId || record.serverId === shiftId) {
      shiftIds.add(record.shiftId);
      if (record.serverId) shiftIds.add(record.serverId);
    }
  }

  const pendingMutations = await mutationQueue.getPending();
  for (const mutation of pendingMutations) {
    const closeMatch = mutation.method === 'PUT'
      && [...shiftIds].some((id) => mutation.url === `/shifts/${id}`);
    if (closeMatch) {
      await mutationQueue.removeById(mutation.id);
    }
  }

  const db = await getOfflineDb();
  const allRecords = await db.getAll('localShifts');
  for (const record of allRecords) {
    if (
      record.shiftId === shiftId
      || record.serverId === shiftId
      || shiftIds.has(record.shiftId)
    ) {
      try {
        await mutationQueue.removeById(record.mutationId);
      } catch {
        // Mutation may already be removed.
      }
      await db.delete('localShifts', record.localId);
    }
  }
}

export async function finalizeShiftClose(shiftId: number): Promise<void> {
  store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
  await persistAuthSnapshot().catch(() => undefined);
  await discardPendingShiftMutations(shiftId);
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
  const p = persistAuthSnapshot().catch(() => undefined) as Promise<void>;
  trackWrite(p);
  const persist = persistOfflineClockInInBackground(shift).catch((err) => {
    console.error('[OfflineShift] Clock-in background persist failed:', err);
  });
  trackWrite(persist);
  return { ...shift, _pendingSync: true };
}

export async function updateOfflineShiftOpeningBalance(
  shiftId: number,
  openingBalance: number | null,
  currentShift: ShiftRecord | null,
): Promise<ShiftWithSyncMeta> {
  await localShiftsStore.patchShiftFields(shiftId, { opening_balance: openingBalance });

  await mutationQueue
    .enqueue({
      method: 'PUT',
      url: `/shifts/${shiftId}`,
      data: { opening_balance: openingBalance },
      maxRetries: 3,
    })
    .catch((err) => {
      console.error('[OfflineShift] Opening-balance enqueue failed:', err);
    });

  const updated: ShiftRecord = {
    ...(currentShift ?? buildLocalShift()),
    id: shiftId,
    opening_balance: openingBalance,
    updated_at: new Date().toISOString(),
  };

  return { ...updated, _pendingSync: true };
}

async function persistOfflineClockOutInBackground(
  shiftId: number,
  shift: ShiftRecord,
  totals: Record<string, number | null>,
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
        counted_cash: totals.counted_cash ?? null,
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
  totals: Record<string, number | null>,
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
  const p = persistAuthSnapshot().catch(() => undefined) as Promise<void>;
  trackWrite(p);

  const persist = persistOfflineClockOutInBackground(shiftId, completed, totals).catch((err) => {
    console.error('[OfflineShift] Clock-out background persist failed:', err);
  });
  trackWrite(persist);

  return { ...completed, _pendingSync: true };
}
