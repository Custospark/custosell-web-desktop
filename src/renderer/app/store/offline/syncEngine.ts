import { axiosInstance } from '../../api/axiosConfig';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import type { QueuedMutation } from './mutationQueue';

export async function processMutation(m: QueuedMutation): Promise<boolean> {
  try {
    await mutationQueue.markSyncing(m.id);

    const config: any = {
      method: m.method,
      url: m.url,
      data: m.data,
      headers: m.headers,
    };

    await axiosInstance(config);

    await mutationQueue.markCompleted(m.id);
    return true;
  } catch (error: any) {
    const isServerError = error?.response?.status >= 400 && error?.response?.status < 500;
    if (isServerError && m.retryCount >= m.maxRetries) {
      await mutationQueue.markFailed(m.id, error?.response?.data?.message || error.message);
    } else if (isServerError) {
      await mutationQueue.markFailed(m.id, error?.response?.data?.message || error.message);
    } else {
      await mutationQueue.markFailed(m.id, error?.message || 'Network error');
    }
    return false;
  }
}

export async function syncAllMutations(): Promise<{ synced: number; failed: number }> {
  console.log('[SyncEngine] syncAllMutations started');
  const pending = await mutationQueue.getPending();
  console.log('[SyncEngine] Pending mutations:', pending.length, JSON.stringify(pending.map(m => ({ id: m.id, url: m.url, method: m.method, status: m.status }))));

  if (pending.length === 0) {
    console.log('[SyncEngine] No pending mutations — skipping');
    return { synced: 0, failed: 0 };
  }

  const saleMutations = pending.filter((m) => m.url === '/sales' && m.method === 'POST');
  const otherMutations = pending.filter((m) => !(m.url === '/sales' && m.method === 'POST'));
  console.log('[SyncEngine] Sale mutations:', saleMutations.length, 'Other mutations:', otherMutations.length);

  let synced = 0;
  let failed = 0;

  if (saleMutations.length > 0) {
    console.log('[SyncEngine] Posting batch of', saleMutations.length, 'sales');
    try {
      const sales = saleMutations.map((m) => m.data);
      console.log('[SyncEngine] Batch payload:', JSON.stringify(sales).slice(0, 500));
      const response = await axiosInstance.post('/sales/batch', { sales });
      console.log('[SyncEngine] Batch response:', response.status, JSON.stringify(response.data).slice(0, 200));
      for (const m of saleMutations) {
        await mutationQueue.markCompleted(m.id);
      }
      synced += saleMutations.length;
      console.log('[SyncEngine] Batch sync successful — marked', saleMutations.length, 'completed');
    } catch (e: any) {
      console.error('[SyncEngine] Batch sync failed:', e?.message, e?.response?.status, e?.response?.data);
      for (const m of saleMutations) {
        await mutationQueue.markFailed(m.id, e?.response?.data?.message || e?.message || 'Batch sync failed');
      }
      failed += saleMutations.length;
    }
  }

  for (const m of otherMutations) {
    const ok = await processMutation(m);
    if (ok) synced++;
    else failed++;
  }

  await mutationQueue.clearCompleted();
  console.log('[SyncEngine] Done — synced:', synced, 'failed:', failed);
  return { synced, failed };
}

export async function processStockAdjustments(): Promise<number> {
  const adjustments = await stockLedger.getPendingAdjustments();
  let synced = 0;

  for (const adj of adjustments) {
    try {
      await axiosInstance.post('/stock-movements', {
        product_id: adj.productId,
        quantity_change: adj.delta,
        type: adj.reason === 'sale' ? 'sale' : 'adjustment',
        notes: `Offline sync: ${adj.reason}`,
      });
      await stockLedger.markAdjustmentSynced(adj.id);
      synced++;
    } catch {
      break;
    }
  }

  return synced;
}
