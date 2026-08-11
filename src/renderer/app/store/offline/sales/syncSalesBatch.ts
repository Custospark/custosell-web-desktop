import type { AxiosError } from 'axios';
import { axiosInstance, queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
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
import { entityIdMapper } from '../sync/entityIdMapper';
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

function remapSalePayload(
  payload: CreateSalePayload,
  shiftIdMap: Map<number, number>,
  orderIdMap: Map<number, number> = new Map(),
): CreateSalePayload {
  const next = { ...payload };
  if (next.shift_id && shiftIdMap.has(next.shift_id)) {
    next.shift_id = shiftIdMap.get(next.shift_id)!;
  }
  if (next.order_id && orderIdMap.has(next.order_id)) {
    next.order_id = orderIdMap.get(next.order_id)!;
  }
  return next;
}

function saleWaitingForOrderRemap(
  payload: CreateSalePayload,
  orderIdMap: Map<number, number>,
): boolean {
  const orderId = payload.order_id;
  return typeof orderId === 'number' && orderId < 0 && !orderIdMap.has(orderId);
}

export function sortSalesMutationsChronologically(mutations: QueuedMutation[]): QueuedMutation[] {
  return [...mutations].sort((a, b) => {
    const shiftA = (a.data as CreateSalePayload)?.shift_id ?? 0;
    const shiftB = (b.data as CreateSalePayload)?.shift_id ?? 0;
    if (shiftA !== shiftB) return shiftA - shiftB;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

async function commitSaleSync(
  m: QueuedMutation,
  serverSale?: Sale,
  saleIdMap?: Map<number, number>,
): Promise<void> {
  const localRecord = await localSalesStore.getByMutationId(m.id);
  await commitMutationQueueEntry(m.id);
  await localSalesStore.removeByMutationId(m.id);

  if (serverSale && localRecord) {
    if (localRecord.sale.id < 0 && serverSale.id > 0) {
      saleIdMap?.set(localRecord.sale.id, serverSale.id);
      const businessId = store.getState().auth.user?.business_id ?? undefined;
      await entityIdMapper.rememberId('sale', localRecord.sale.id, serverSale.id, businessId);
    }
    applySyncedSaleToCache(queryClient, localRecord.sale, serverSale);
    // Fiscal_* from SaleService (or pending/failed) now live on the server row in cache.
  }
}

async function finalizeSalesSyncUi(): Promise<void> {
  await refreshSalesUiAfterCommit();
}

async function markSaleFailed(m: QueuedMutation, message: string): Promise<void> {
  await mutationQueue.markFailed(m.id, message);
  await localSalesStore.markFailedByMutationId(m.id);
}

async function reconcileDuplicateSale(
  m: QueuedMutation,
  message: string,
  saleIdMap: Map<number, number>,
): Promise<boolean> {
  if (!/duplicate|already|exists|unique/i.test(message)) return false;

  const committed = await commitMutationQueueEntryIfPresent(m.id);
  if (committed) {
    await commitSaleSync(m, undefined, saleIdMap);
  }
  return committed;
}

function salePayloadMatchesServer(payload: CreateSalePayload, sale: Sale): boolean {
  if (payload.shift_id != null && sale.shift_id !== payload.shift_id) return false;
  if (sale.payment_method !== payload.payment_method) return false;

  const payloadLine = payload.items
    .map((item) => `${item.product_id}:${item.quantity}:${item.unit_price}`)
    .sort()
    .join('|');
  const serverLine = (sale.sale_items ?? [])
    .map((item) => `${item.product_id}:${item.quantity}:${parseFloat(item.unit_price)}`)
    .sort()
    .join('|');
  if (payloadLine !== serverLine) return false;

  const serverTotal = parseFloat(sale.total_amount);
  return Math.abs(serverTotal - payload.total_amount) < 0.02;
}

/** When sync POST fails without a response, the server may still have created the sale. */
async function reconcileAmbiguousSaleFailure(
  m: QueuedMutation,
  payload: CreateSalePayload,
): Promise<Sale | undefined> {
  if (!payload.shift_id) return undefined;

  try {
    const response = await axiosInstance.get<{ data?: Sale[] } | Sale[]>(
      `/sales/by-shift/${payload.shift_id}`,
      { timeout: SALES_BATCH_TIMEOUT_MS, skipAuthRedirect: true },
    );
    const sales = extractBatchSales(response.data);
    const mutationTime = Date.parse(m.createdAt);
    const windowMs = 30 * 60 * 1000;

    const candidates = sales.filter((sale) => {
      if (sale.receipt_number?.startsWith('OFF-')) return false;
      if (!salePayloadMatchesServer(payload, sale)) return false;
      const saleTime = Date.parse(sale.created_at ?? sale.sale_date);
      if (!Number.isNaN(mutationTime) && !Number.isNaN(saleTime)) {
        return Math.abs(saleTime - mutationTime) <= windowMs;
      }
      return true;
    });

    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1 && !Number.isNaN(mutationTime)) {
      return [...candidates].sort(
        (a, b) =>
          Math.abs(Date.parse(a.created_at ?? a.sale_date) - mutationTime) -
          Math.abs(Date.parse(b.created_at ?? b.sale_date) - mutationTime),
      )[0];
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function syncSingleSale(
  m: QueuedMutation,
  idMap: Map<number, number>,
  saleIdMap: Map<number, number>,
  orderIdMap: Map<number, number>,
): Promise<boolean> {
  const queued = await mutationQueue.getById(m.id);
  if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) {
    return true;
  }

  const rawPayload = m.data as CreateSalePayload;
  if (saleWaitingForOrderRemap(rawPayload, orderIdMap)) {
    console.warn('[SyncEngine] Sale waiting for order id remap:', {
      mutationId: m.id,
      orderId: rawPayload.order_id,
    });
    return false;
  }

  const payload = remapSalePayload(rawPayload, idMap, orderIdMap);
  try {
    await mutationQueue.markSyncing(m.id);
    const response = await axiosInstance.post<{ data?: Sale } | Sale>('/sales', payload, {
      timeout: SALES_BATCH_TIMEOUT_MS,
      skipAuthRedirect: true,
    });
    const wrapped = response.data as { data?: Sale };
    const serverSale = extractBatchSales(response.data)[0] ?? wrapped?.data ?? (response.data as Sale);
    await commitSaleSync(m, serverSale, saleIdMap);
    return true;
  } catch (error: unknown) {
    if (isAuthHttpError(error)) throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
    const axiosErr = error as AxiosError;
    if (!axiosErr.response) {
      const reconciled = await reconcileAmbiguousSaleFailure(m, payload);
      if (reconciled) {
        await commitSaleSync(m, reconciled, saleIdMap);
        return true;
      }
    }
    const message = extractErrorMessage(error, 'Sale sync failed');
    if (await reconcileDuplicateSale(m, message, saleIdMap)) return true;
    await markSaleFailed(m, message);
    return false;
  }
}

async function syncSalesChunkBatch(
  chunk: QueuedMutation[],
  idMap: Map<number, number>,
  saleIdMap: Map<number, number>,
  orderIdMap: Map<number, number>,
): Promise<{ synced: number; failed: number }> {
  const activeChunk = (
    await Promise.all(chunk.map(async (m) => ({ m, queued: await mutationQueue.getById(m.id) })))
  )
    .filter(({ queued }) => queued && (queued.status === 'queued' || queued.status === 'failed'))
    .map(({ m }) => m)
    .filter((m) => !saleWaitingForOrderRemap(m.data as CreateSalePayload, orderIdMap));

  if (activeChunk.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const sales = activeChunk.map((m) => remapSalePayload(m.data as CreateSalePayload, idMap, orderIdMap));

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
        await commitSaleSync(m, serverSale, saleIdMap);
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
    const ok = await syncSingleSale(m, idMap, saleIdMap, orderIdMap);
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
  saleIdMap: Map<number, number>,
  reporter?: SyncProgressReporter,
  orderIdMap: Map<number, number> = new Map(),
): Promise<{ synced: number; failed: number }> {
  if (saleMutations.length === 0) return { synced: 0, failed: 0 };

  reporter?.setTier(2, 'Sales');

  const sorted = sortSalesMutationsChronologically(saleMutations);
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < sorted.length; i += SALES_BATCH_SIZE) {
    if (isOfflineMode()) break;
    const chunk = sorted.slice(i, i + SALES_BATCH_SIZE);
    const result = await syncSalesChunkBatch(chunk, idMap, saleIdMap, orderIdMap);
    synced += result.synced;
    failed += result.failed;
    reporter?.addProgress(result.synced, result.failed);
    if (i + SALES_BATCH_SIZE < sorted.length) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  return { synced, failed };
}
