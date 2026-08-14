import { axiosInstance } from '../../../api/axiosConfig';
import { cartItemsToOrderItems, type CreateOrderPayload } from '../../../../modules/sales/api/orders/orderTypes';
import type { CartItem } from '../../../../modules/sales/api/salesTypes';
import { isOnlineMode } from '../core/offlineQueryUtils';

const HELD_ORDERS_KEY = 'heldOrders';
const MIGRATION_FLAG_KEY = 'heldOrdersMigratedV1';

/** Legacy localStorage hold shape (pre-DB orders). */
interface LegacyHeldOrder {
  id: string;
  timestamp: number;
  customerName?: string;
  items: CartItem[];
  customerId?: number | null;
  notes?: string;
  total?: number;
}

function readLegacyHeldOrders(): LegacyHeldOrder[] {
  try {
    const raw = localStorage.getItem(HELD_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyHeldOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clearLegacyHeldOrders(): void {
  try {
    localStorage.removeItem(HELD_ORDERS_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch {
    /* noop */
  }
}

/**
 * One-time: push remaining localStorage heldOrders to POST /orders, then clear the key.
 * Safe to call on every online sync - no-ops after migration flag or empty storage.
 */
export async function migrateHeldOrdersFromLocalStorage(): Promise<number> {
  if (!isOnlineMode()) return 0;
  try {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1' && !localStorage.getItem(HELD_ORDERS_KEY)) {
      return 0;
    }
  } catch {
    /* continue */
  }

  const legacy = readLegacyHeldOrders();
  if (legacy.length === 0) {
    clearLegacyHeldOrders();
    return 0;
  }

  let migrated = 0;
  for (const held of legacy) {
    if (!held.items?.length) continue;
    const subtotal = held.items.reduce((s, c) => s + c.unit_price * c.quantity, 0);
    const payload: CreateOrderPayload = {
      customer_id: held.customerId ?? null,
      customer_name: held.customerName || 'Guest',
      notes: held.notes || null,
      subtotal,
      tax_total: 0,
      discount_amount: 0,
      total_amount: held.total ?? subtotal,
      items: cartItemsToOrderItems(held.items),
    };
    try {
      await axiosInstance.post('/orders', payload, { skipAuthRedirect: true });
      migrated++;
    } catch (err) {
      console.warn('[OrdersMigration] Failed to migrate held order', held.id, err);
    }
  }

  // Clear even if some failed - avoids infinite retry loops on permanently bad rows.
  clearLegacyHeldOrders();
  return migrated;
}
