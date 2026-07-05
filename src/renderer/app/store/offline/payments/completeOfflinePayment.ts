import { queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { localSalesStore, toSaleWithSyncMeta, type SaleWithSyncMeta } from '../sales/localSalesStore';
import { getOfflineDb } from '../core/offlineDb';
import { offlinePaymentReceiptNumber } from '../../../../shared/utils/documentNumbers';
import { computeSaleBalance } from '../../../../modules/payments/payableBalance';
import type { RecordPaymentPayload, Payment, RecordSalePaymentResult } from '../../../../modules/payments/paymentTypes';
import type { Sale } from '../../../../modules/sales/api/salesTypes';

export function shouldCompletePaymentLocally(): boolean {
  return shouldCompleteMutationLocally();
}

function buildLocalPaymentReceiptNumber(): string {
  return offlinePaymentReceiptNumber();
}

async function updatePendingLocalSale(saleId: number, updater: (sale: Sale) => Sale): Promise<SaleWithSyncMeta | null> {
  const db = await getOfflineDb();
  const records = await localSalesStore.getAll();
  const record = records.find((r) => r.sale.id === saleId && r.syncStatus !== 'synced');
  if (!record) return null;
  record.sale = updater(record.sale);
  await db.put('localSales', record);
  return toSaleWithSyncMeta(record);
}

export async function completeOfflineSalePayment(
  saleId: number,
  payload: RecordPaymentPayload,
): Promise<RecordSalePaymentResult> {
  const authUser = store.getState().auth.user;
  const now = new Date().toISOString();
  const localPaymentId = -Date.now();

  const cachedSales = queryClient.getQueryData<SaleWithSyncMeta[]>(['sales']) ?? [];
  let sale = cachedSales.find((s) => s.id === saleId) ?? null;
  if (!sale) {
    const pending = await localSalesStore.getAll();
    const record = pending.find((r) => r.sale.id === saleId);
    sale = record ? toSaleWithSyncMeta(record) : null;
  }
  if (!sale) {
    throw new Error('Sale not found offline');
  }

  const remainingBefore = computeSaleBalance(sale);
  if (payload.amount > remainingBefore + 0.001) {
    throw new Error('Payment exceeds remaining balance');
  }

  const prevPaid = parseFloat(String(sale.amount_paid ?? 0));
  const newAmountPaid = prevPaid + payload.amount;
  const netTotal = remainingBefore + prevPaid;
  const balanceAfter = Math.max(0, netTotal - newAmountPaid);
  const paymentStatus = balanceAfter < 0.01 ? 'paid' : 'partially_paid';

  const payment: Payment = {
    id: localPaymentId,
    business_id: sale.business_id,
    payable_type: 'sale',
    payable_id: sale.id,
    receipt_number: buildLocalPaymentReceiptNumber(),
    amount: payload.amount,
    amount_tendered: payload.amount_tendered ?? payload.amount,
    change_given: payload.change_given ?? null,
    payment_method: payload.payment_method,
    balance_after: balanceAfter,
    paid_at: now,
    notes: payload.notes ?? null,
    recorded_by: authUser?.id ?? null,
    _pendingSync: true,
  };

  const applyUpdate = (s: Sale): Sale => ({
    ...s,
    amount_paid: String(newAmountPaid),
    payment_status: paymentStatus,
    payments: [...(s.payments ?? []), payment],
    updated_at: now,
  });

  const updatedSale = applyUpdate(sale) as SaleWithSyncMeta;
  updatedSale._pendingSync = sale._pendingSync;

  await updatePendingLocalSale(saleId, applyUpdate);
  queryClient.setQueryData<SaleWithSyncMeta[]>(['sales'], (old) =>
    (old ?? []).map((s) => (s.id === saleId ? updatedSale : s)),
  );

  const formData = new FormData();
  formData.append('amount', String(payload.amount));
  formData.append('payment_method', payload.payment_method);
  if (payload.notes) formData.append('notes', payload.notes);
  if (payload.amount_tendered != null) formData.append('amount_tendered', String(payload.amount_tendered));
  if (payload.change_given != null) formData.append('change_given', String(payload.change_given));
  if (payload.attachment) formData.append('attachment', payload.attachment);

  await mutationQueue.enqueue({
    method: 'POST',
    url: `/sales/${saleId}/payment`,
    data: formData,
    maxRetries: 3,
  });

  return { sale: updatedSale, payment };
}
