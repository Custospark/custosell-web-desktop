import { axiosInstance } from '../../api/axiosConfig';
import { mutationQueue } from './mutationQueue';
import { stockLedger } from './stockLedger';
import { localSalesStore } from './localSalesStore';
import type { QueuedMutation } from './mutationQueue';
import type { Sale } from '../../../modules/sales/api/salesTypes';

export async function processMutation(m: QueuedMutation): Promise<boolean> {
  try {
    await mutationQueue.markSyncing(m.id);

    const config: {
      method: QueuedMutation['method'];
      url: string;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      method: m.method,
      url: m.url,
      data: m.data,
      headers: m.headers,
    };

    await axiosInstance(config);

    await mutationQueue.markCompleted(m.id);
    return true;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
    const isServerError = err?.response?.status && err.response.status >= 400 && err.response.status < 500;
    if (isServerError && m.retryCount >= m.maxRetries) {
      await mutationQueue.markFailed(m.id, err?.response?.data?.message || err.message || 'Request failed');
    } else if (isServerError) {
      await mutationQueue.markFailed(m.id, err?.response?.data?.message || err.message || 'Request failed');
    } else {
      await mutationQueue.markFailed(m.id, err?.message || 'Network error');
    }
    return false;
  }
}

function extractBatchSales(responseData: unknown): Sale[] {
  if (!responseData || typeof responseData !== 'object') return [];
  const data = responseData as { data?: Sale[]; sales?: Sale[] };
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.sales)) return data.sales;
  return [];
}

export async function syncAllMutations(): Promise<{ synced: number; failed: number }> {
  const pending = await mutationQueue.getPending();

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const saleMutations = pending.filter((m) => m.url === '/sales' && m.method === 'POST');
  const otherMutations = pending.filter((m) => !(m.url === '/sales' && m.method === 'POST'));

  let synced = 0;
  let failed = 0;

  if (saleMutations.length > 0) {
    try {
      const sales = saleMutations.map((m) => m.data);
      const response = await axiosInstance.post('/sales/batch', { sales });
      const syncedSales = extractBatchSales(response.data);

      for (let i = 0; i < saleMutations.length; i++) {
        const m = saleMutations[i];
        const serverSale = syncedSales[i];
        await mutationQueue.markCompleted(m.id);
        await localSalesStore.markSyncedByMutationId(m.id, serverSale?.id, serverSale);
      }
      synced += saleMutations.length;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Batch sync failed';
      for (const m of saleMutations) {
        await mutationQueue.markFailed(m.id, message);
        await localSalesStore.markFailedByMutationId(m.id);
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
  await localSalesStore.removeSynced();
  return { synced, failed };
}

export async function processStockAdjustments(): Promise<number> {
  const adjustments = (await stockLedger.getPendingAdjustments()).filter(
    (adj) => adj.reason !== 'sale',
  );
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

  await stockLedger.clearSynced();
  return synced;
}
