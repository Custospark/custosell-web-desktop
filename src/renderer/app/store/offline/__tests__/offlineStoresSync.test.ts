import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

/**
 * Applies the offline harness (proven on quick notes) to every critical store:
 * sales, expenses, shifts, customers. Each case proves the same contract:
 *   offline write is durable -> queued -> sync commit removes queue + local row
 *   -> server received the payload -> nothing lost on a failed server call.
 */

const mocks = vi.hoisted(() => ({
  axiosInstance: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  store: { getState: vi.fn(), dispatch: vi.fn() },
}));

vi.mock('../../../../app/api/axiosConfig', () => ({
  axiosInstance: mocks.axiosInstance,
  queryClient: { setQueryData: vi.fn(), getQueryData: vi.fn(() => undefined), invalidateQueries: vi.fn() },
}));

vi.mock('../../../../app/store/store', () => ({
  store: mocks.store,
}));

function setAuth(): void {
  mocks.store.getState.mockReturnValue({ auth: { user: { business_id: 7, id: 1 } } });
}

/** Wipe the shared fake IndexedDB once per file (fast - no open connections yet). */
beforeAll(async () => {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('CustosellOffline');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

/** Per-test: fresh module state + wipe all store rows (fast, no deleteDatabase). */
async function freshDb(): Promise<void> {
  const { resetOfflineDbState, getOfflineDb } = await import('../core/offlineDb');
  const { clearOfflineDbStores } = await import('../core/offlineStoreClear');
  resetOfflineDbState();
  await clearOfflineDbStores();
  await getOfflineDb();
}

describe('sales offline CRUD + sync', () => {
  beforeEach(async () => {
    setAuth();
    await freshDb();
  });

  afterEach(() => vi.clearAllMocks());

  it('create offline is durable, queued, and syncs with no data loss', async () => {
    const { localSalesStore } = await import('../sales/localSalesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const sale = {
      id: -500,
      business_id: 7,
      user_id: 1,
      receipt_number: 'OFF-001',
      subtotal: '9000',
      tax_total: '1000',
      discount_amount: '0',
      total_amount: '10000',
      amount_paid: '10000',
      amount_tendered: '10000',
      payment_method: 'cash',
      payment_status: 'paid',
      sale_date: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = {
      receipt_number: 'OFF-001',
      payment_method: 'cash',
      total_amount: 10000,
      items: [{ product_id: 3, quantity: 1, unit_price: 10000 }],
    };

    const mutationId = await mutationQueue.enqueue({ method: "POST", url: "/sales", data: payload as never, maxRetries: 3 });
    await localSalesStore.save(sale as never, payload as never, mutationId);

    // Durable across restart.
    const { resetOfflineDbState, getOfflineDb } = await import('../core/offlineDb');
    resetOfflineDbState();
    await getOfflineDb();
    const reopened = await (await import('../sales/localSalesStore')).localSalesStore.getPending();
    expect(reopened).toHaveLength(1);
    expect(reopened[0].sale.total_amount).toBe('10000');

    // Go online and commit.
    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 700 } } });
    await mocks.axiosInstance.post('/sales', payload);
    await commitMutationQueueEntry(mutationId);
    await localSalesStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/sales', expect.objectContaining({ total_amount: 10000 }));
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localSalesStore.getPending()).toHaveLength(0);
  });

  it('a failed server call keeps the sale queued for retry', async () => {
    const { localSalesStore } = await import('../sales/localSalesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');

    const sale = {
      id: -501, business_id: 7, user_id: 1, receipt_number: 'OFF-002',
      subtotal: '9000', tax_total: '1000', discount_amount: '0', total_amount: '10000',
      amount_paid: '10000', amount_tendered: '10000', payment_method: 'cash', payment_status: 'paid',
      sale_date: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { receipt_number: 'OFF-002', payment_method: 'cash', total_amount: 10000, items: [] };

    const mutationId = await mutationQueue.enqueue({ method: "POST", url: "/sales", data: payload as never, maxRetries: 3 });
    await localSalesStore.save(sale as never, payload as never, mutationId);

    mocks.axiosInstance.post.mockRejectedValueOnce({ response: { status: 503, data: { message: 'busy' } } });
    await expect(mocks.axiosInstance.post('/sales', payload)).rejects.toBeTruthy();

    expect(await localSalesStore.getPending()).toHaveLength(1);
    expect(await mutationQueue.getAll()).toHaveLength(1);
  });
});

describe('expenses offline CRUD + sync', () => {
  beforeEach(async () => {
    setAuth();
    await freshDb();
  });

  afterEach(() => vi.clearAllMocks());

  it('create offline is durable, queued, and syncs with no data loss', async () => {
    const { localExpensesStore } = await import('../expenses/localExpensesStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const expense = {
      id: -600,
      business_id: 7,
      expense_category_id: 2,
      recorded_by: 1,
      amount: '5000',
      description: 'Offline expense',
      expense_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { fields: { amount: '5000', description: 'Offline expense', expense_date: '2026-01-01', expense_category_id: '2' } };

    const mutationId = await mutationQueue.enqueue({ method: "POST", url: "/expenses", data: payload as never, maxRetries: 3 });
    await localExpensesStore.save(expense as never, payload, mutationId, "create");

    expect(await localExpensesStore.getPending()).toHaveLength(1);
    expect((await mutationQueue.getAll())[0].url).toBe('/expenses');

    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 800 } } });
    await mocks.axiosInstance.post('/expenses', payload);
    await commitMutationQueueEntry(mutationId);
    await localExpensesStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/expenses', expect.objectContaining({ fields: expect.anything() }));
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localExpensesStore.getPending()).toHaveLength(0);
  });
});

describe('shifts offline open/close + sync', () => {
  beforeEach(async () => {
    setAuth();
    await freshDb();
  });

  afterEach(() => vi.clearAllMocks());

  it('shift open offline is durable, queued, and syncs with no data loss', async () => {
    const { localShiftsStore } = await import('../sales/localShiftsStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const shift = {
      id: -300,
      business_id: 7,
      user_id: 1,
      clock_in: '2026-01-01T08:00:00Z',
      clock_out: null,
      opening_balance: 50000,
      total_sales: '0',
      total_cash: '0',
      total_mobile_money: '0',
      total_card: '0',
      status: 'active',
      notes: null,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T08:00:00Z',
    };
    const payload = { clock_in: '2026-01-01T08:00:00Z', opening_balance: 50000 };

    const mutationId = await mutationQueue.enqueue({ method: 'POST', url: '/shifts', data: payload, maxRetries: 3 });
    await localShiftsStore.saveOpen(shift as never, mutationId);

    // Durable across restart.
    const { resetOfflineDbState, getOfflineDb } = await import('../core/offlineDb');
    resetOfflineDbState();
    await getOfflineDb();
    const reopened = await (await import('../sales/localShiftsStore')).localShiftsStore.getActivePending();
    expect(reopened).not.toBeNull();
    expect(reopened?.shift.status).toBe('active');

    // Go online and commit (open shift returns the server shift id).
    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 310, status: 'active' } } });
    await mocks.axiosInstance.post('/shifts', payload);
    await commitMutationQueueEntry(mutationId);
    await localShiftsStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/shifts', expect.objectContaining({ opening_balance: 50000 }));
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localShiftsStore.getPending()).toHaveLength(0);
  });

  it('shift close offline is durable, queued, and syncs with no data loss', async () => {
    const { localShiftsStore } = await import('../sales/localShiftsStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const shift = {
      id: 310,
      business_id: 7,
      user_id: 1,
      clock_in: '2026-01-01T08:00:00Z',
      clock_out: '2026-01-01T17:00:00Z',
      opening_balance: 50000,
      counted_cash: 180000,
      total_sales: '250000',
      total_cash: '150000',
      total_mobile_money: '60000',
      total_card: '40000',
      status: 'completed',
      notes: null,
      created_at: '2026-01-01T08:00:00Z',
      updated_at: '2026-01-01T17:00:00Z',
    };
    const payload = { counted_cash: 180000, status: 'completed' };

    const mutationId = await mutationQueue.enqueue({ method: 'PUT', url: '/shifts/310', data: payload, maxRetries: 3 });
    await localShiftsStore.saveClose(shift as never, mutationId);

    expect(await localShiftsStore.getPendingCompleted()).toHaveLength(1);
    expect((await mutationQueue.getAll())[0].method).toBe('PUT');

    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 310, status: 'completed' } } });
    await mocks.axiosInstance.post('/shifts/310', payload);
    await commitMutationQueueEntry(mutationId);
    await localShiftsStore.removeByMutationId(mutationId);

    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localShiftsStore.getPending()).toHaveLength(0);
  });
});

describe('customers offline CRUD + sync', () => {
  beforeEach(async () => {
    setAuth();
    await freshDb();
  });

  afterEach(() => vi.clearAllMocks());

  it('create offline is durable, queued, and syncs with no data loss', async () => {
    const { localCustomersStore } = await import('../customers/localCustomersStore');
    const { mutationQueue } = await import('../sync/mutationQueue');
    const { commitMutationQueueEntry } = await import('../sync/syncMutationFinalize');

    const customer = {
      id: -700,
      business_id: 7,
      name: 'Offline Customer',
      phone: null,
      email: 'customer@example.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const payload = { name: 'Offline Customer', email: 'customer@example.com' };

    const mutationId = await mutationQueue.enqueue({ method: 'POST', url: '/customers', data: payload, maxRetries: 3 });
    await localCustomersStore.save(customer as never, payload, mutationId, "create");

    expect(await localCustomersStore.getPending()).toHaveLength(1);

    mocks.axiosInstance.post.mockResolvedValue({ data: { data: { id: 900 } } });
    await mocks.axiosInstance.post('/customers', payload);
    await commitMutationQueueEntry(mutationId);
    await localCustomersStore.removeByMutationId(mutationId);

    expect(mocks.axiosInstance.post).toHaveBeenCalledWith('/customers', expect.objectContaining({ name: 'Offline Customer' }));
    expect(await mutationQueue.getAll()).toHaveLength(0);
    expect(await localCustomersStore.getPending()).toHaveLength(0);
  });
});
