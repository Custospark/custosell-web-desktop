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
  const pending = await mutationQueue.getPending();
  let synced = 0;
  let failed = 0;

  for (const m of pending) {
    const ok = await processMutation(m);
    if (ok) synced++;
    else failed++;
  }

  await mutationQueue.clearCompleted();
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
