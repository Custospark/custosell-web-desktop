import { store } from '../../store';
import { shouldCompleteMutationLocally } from '../core/offlineQueryUtils';
import { trackWrite } from '../core/offlineWriteTracker';
import { stockLedger } from './stockLedger';
import type { CreateStockMovementData, StockMovement } from '../../../../modules/inventory/api/products/ProductTypes';

export function shouldCompleteStockAdjustmentLocally(): boolean {
  return shouldCompleteMutationLocally();
}

function buildLocalStockMovement(payload: CreateStockMovementData): StockMovement {
  const now = new Date().toISOString();
  const authUser = store.getState().auth.user;

  return {
    id: -Date.now(),
    business_id: authUser?.business_id ?? 0,
    product_id: payload.product_id,
    sale_item_id: null,
    location_id: payload.location_id ?? null,
    to_location_id: null,
    type: payload.type,
    quantity_change: payload.quantity_change,
    stock_before: payload.stock_before,
    stock_after: payload.stock_after,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
    created_by: authUser?.id ?? null,
    created_by_user: authUser
      ? { id: authUser.id, name: authUser.name, email: authUser.email, avatar: authUser.avatar ?? null }
      : null,
    created_at: now,
    updated_at: now,
  };
}

export async function persistOfflineStockAdjustmentInBackground(
  payload: CreateStockMovementData,
): Promise<void> {
  await stockLedger.adjust(
    payload.product_id,
    payload.quantity_change,
    payload.notes ?? payload.type,
    payload.stock_before,
  );
}

/**
 * Persists the stock ledger + pending adjustment row, then resolves. The UI's
 * mutation awaits this so a durable IndexedDB write is committed before the
 * action is reported complete - closing the hard-power-loss data-loss window.
 */
export async function completeOfflineStockAdjustmentInstant(
  payload: CreateStockMovementData,
): Promise<StockMovement> {
  const movement = buildLocalStockMovement(payload);
  const persist = persistOfflineStockAdjustmentInBackground(payload).catch((err) => {
    console.error('[OfflineStockAdjustment] Background persist failed:', err);
  });
  trackWrite(persist);
  await persist;
  return movement;
}
