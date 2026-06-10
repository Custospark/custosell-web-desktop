import { axiosInstance, queryClient } from '../../../api/axiosConfig';
import { mutationQueue } from '../sync/mutationQueue';
import { localSalesStore } from './localSalesStore';
import type { QueuedMutation } from '../sync/mutationQueue';
import type { CreateSalePayload, Sale } from '../../../../modules/sales/api/salesTypes';
import type { SyncProgressReporter } from '../sync/syncProgressReporter';
import {
  BATCH_PAUSE_MS,
  NETWORK_RETRY_DELAYS_MS,
  NETWORK_RETRY_MAX,
  SALES_BATCH_SIZE,
  SALES_BATCH_TIMEOUT_MS,
} from '../sync/syncConstants';
import {
  AuthSyncPauseError,
  extractErrorMessage,
  isAuthHttpError,
  isNetworkOrServerError,
  sleep,
} from '../sync/syncErrorUtils';
import { isOfflineMode } from '../core/offlineQueryUtils';
import { refreshSalesUiAfterCommit } from '../sync/syncCacheRefresh';
import { applySyncedSaleToCache } from '../sync/offlineCacheReconcile';
import { commitMutationQueueEntry, commitMutationQueueEntryIfPresent } from '../sync/syncMutationFinalize';

function extractBatchSales(responseData: unknown): Sale[] {
  if (!responseData || typeof responseData !== 'object') return [];
  const data = responseData as { data?: Sale[]; sales?: Sale[] };
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.sales)) return data.sales;
  return [];
}

function remapSalePayload(payload: CreateSalePayload, idMap: Map<number, number>): CreateSalePayload {
  const next = { ...payload };
  if (next.shift_id && idMap.has(next.shift_id)) {
    next.shift_id = idMap.get(next.shift_id)!;
  }
  return next;
}

export function sortSalesMutationsChronologically(mutations: QueuedMutation[]): QueuedMutation[] {
  return [...mutations].sort((a, b) => {
    const shiftA = (a.data as CreateSalePayload)?.shift_id ?? 0;
    const shiftB = (b.data as CreateSalePayload)?.shift_id ?? 0;
    if (shiftA !== shiftB) return shiftA - shiftB;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

async function commitSaleSync(m: QueuedMutation, serverSale?: Sale): Promise<void> {
  const localRecord = await localSalesStore.getByMutationId(m.id);
  await commitMutationQueueEntry(m.id);
  await localSalesStore.removeByMutationId(m.id);

  if (serverSale && localRecord) {
    applySyncedSaleToCache(queryClient, localRecord.sale, serverSale);
  }
}

async function finalizeSalesSyncUi(): Promise<void> {
  await refreshSalesUiAfterCommit();
}

async function markSaleFailed(m: QueuedMutation, message: string): Promise<void> {
  await mutationQueue.markFailed(m.id, message);
  await localSalesStore.markFailedByMutationId(m.id);
}

async function reconcileDuplicateSale(m: QueuedMutation, message: string): Promise<boolean> {
  if (!/duplicate|already|exists|unique/i.test(message)) return false;

  const committed = await commitMutationQueueEntryIfPresent(m.id);
  if (committed) {
    await commitSaleSync(m);
  }
  return committed;
}

async function syncSingleSale(m: QueuedMutation, idMap: Map<number, number>): Promise<boolean> {
  const queued = await mutationQueue.getById(m.id);
  if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) {
    return true;
  }

  const payload = remapSalePayload(m.data as CreateSalePayload, idMap);
  try {
    await mutationQueue.markSyncing(m.id);
    const response = await axiosInstance.post<{ data?: Sale } | Sale>('/sales', payload, {
      timeout: SALES_BATCH_TIMEOUT_MS,
      skipAuthRedirect: true,
    });
    const wrapped = response.data as { data?: Sale };
    const serverSale = extractBatchSales(response.data)[0] ?? wrapped?.data ?? (response.data as Sale);
    await commitSaleSync(m, serverSale);
    return true;
  } catch (error: unknown) {
    if (isAuthHttpError(error)) throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
    const message = extractErrorMessage(error, 'Sale sync failed');
    if (await reconcileDuplicateSale(m, message)) return true;
    await markSaleFailed(m, message);
    return false;
  }
}

async function syncSalesChunkBatch(
  chunk: QueuedMutation[],
  idMap: Map<number, number>,
): Promise<{ synced: number; failed: number }> {
  const activeChunk = (
    await Promise.all(chunk.map(async (m) => ({ m, queued: await mutationQueue.getById(m.id) })))
  )
    .filter(({ queued }) => queued && (queued.status === 'queued' || queued.status === 'failed'))
    .map(({ m }) => m);

  if (activeChunk.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const sales = activeChunk.map((m) => remapSalePayload(m.data as CreateSalePayload, idMap));

  for (let attempt = 0; attempt < NETWORK_RETRY_MAX; attempt++) {
    try {
      for (const m of activeChunk) await mutationQueue.markSyncing(m.id);

      const response = await axiosInstance.post('/sales/batch', { sales }, {
        timeout: SALES_BATCH_TIMEOUT_MS,
        skipAuthRedirect: true,
      });
      const syncedSales = extractBatchSales(response.data);

      for (let i = 0; i < activeChunk.length; i++) {
        const m = activeChunk[i];
        const serverSale = syncedSales[i];
        await commitSaleSync(m, serverSale);
      }

      await finalizeSalesSyncUi();

      return { synced: activeChunk.length, failed: 0 };
    } catch (error: unknown) {
      if (isAuthHttpError(error)) {
        throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
      }

      if (isNetworkOrServerError(error) && attempt < NETWORK_RETRY_MAX - 1) {
        await sleep(NETWORK_RETRY_DELAYS_MS[attempt] ?? 4000);
        continue;
      }

      break;
    }
  }

  let synced = 0;
  let failed = 0;
  for (const m of activeChunk) {
    const ok = await syncSingleSale(m, idMap);
    if (ok) synced++;
    else failed++;
  }
  if (synced > 0) {
    await finalizeSalesSyncUi();
  }
  return { synced, failed };
}

export async function processSalesInChunks(
  saleMutations: QueuedMutation[],
  idMap: Map<number, number>,
  reporter?: SyncProgressReporter,
): Promise<{ synced: number; failed: number }> {
  if (saleMutations.length === 0) return { synced: 0, failed: 0 };

  reporter?.setTier(2, 'Sales');

  const sorted = sortSalesMutationsChronologically(saleMutations);
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < sorted.length; i += SALES_BATCH_SIZE) {
    if (isOfflineMode()) break;

    const chunk = sorted.slice(i, i + SALES_BATCH_SIZE);
    const result = await syncSalesChunkBatch(chunk, idMap);
    synced += result.synced;
    failed += result.failed;
    reporter?.addProgress(result.synced, result.failed);

    if (i + SALES_BATCH_SIZE < sorted.length) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  return { synced, failed };
}
