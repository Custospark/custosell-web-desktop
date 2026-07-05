import { queryClient } from '../../../api/axiosConfig';
import { store } from '../../store';
import { mutationQueue } from '../sync/mutationQueue';
import { invoiceKeys } from '../../../../modules/invoices/api/InvoiceQueries';
import type { Invoice } from '../../../../modules/invoices/api/InvoiceTypes';
import { computeInvoiceBalance } from '../../../../modules/payments/payableBalance';
import { offlinePaymentReceiptNumber } from '../../../../shared/utils/documentNumbers';
import type { Payment, RecordPaymentPayload, RecordPaymentResult } from '../../../../modules/payments/paymentTypes';

function upsertInvoiceInCache(invoice: Invoice): void {
  queryClient.setQueryData<Invoice[]>(invoiceKeys.list(), (old) => {
    const list = old ?? [];
    const idx = list.findIndex((i) => i.id === invoice.id);
    if (idx === -1) return [invoice, ...list];
    const next = [...list];
    next[idx] = invoice;
    return next;
  });
  queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice);
}

function findInvoiceInCache(invoiceId: number): Invoice | null {
  const detail = queryClient.getQueryData<Invoice>(invoiceKeys.detail(invoiceId));
  if (detail) return detail;
  const list = queryClient.getQueryData<Invoice[]>(invoiceKeys.list()) ?? [];
  return list.find((i) => i.id === invoiceId) ?? null;
}

export async function completeOfflineInvoicePayment(
  invoiceId: number,
  payload: RecordPaymentPayload,
): Promise<RecordPaymentResult> {
  const authUser = store.getState().auth.user;
  const now = new Date().toISOString();
  const localPaymentId = -Date.now();

  const invoice = findInvoiceInCache(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found offline — open Invoices while online first');
  }

  if (!['sent', 'partially_paid'].includes(invoice.status)) {
    throw new Error('Payments can only be recorded on sent or partially paid invoices');
  }

  const remainingBefore = computeInvoiceBalance(invoice);
  if (payload.amount > remainingBefore + 0.001) {
    throw new Error('Payment exceeds remaining balance');
  }

  const prevPaid = invoice.amount_paid ?? 0;
  const newAmountPaid = prevPaid + payload.amount;
  const netTotal = remainingBefore + prevPaid;
  const balanceAfter = Math.max(0, netTotal - newAmountPaid);
  const status = balanceAfter < 0.01 ? 'paid' : 'partially_paid';

  const payment: Payment = {
    id: localPaymentId,
    business_id: invoice.business_id,
    payable_type: 'invoice',
    payable_id: invoice.id,
    receipt_number: offlinePaymentReceiptNumber(),
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

  const updatedInvoice: Invoice = {
    ...invoice,
    amount_paid: newAmountPaid,
    status,
    payments: [...(invoice.payments ?? []), payment],
    updated_at: now,
  };

  upsertInvoiceInCache(updatedInvoice);

  const formData = new FormData();
  formData.append('amount', String(payload.amount));
  formData.append('payment_method', payload.payment_method);
  if (payload.notes) formData.append('notes', payload.notes);
  if (payload.amount_tendered != null) formData.append('amount_tendered', String(payload.amount_tendered));
  if (payload.change_given != null) formData.append('change_given', String(payload.change_given));
  if (payload.attachment) formData.append('attachment', payload.attachment);

  await mutationQueue.enqueue({
    method: 'POST',
    url: `/invoices/${invoiceId}/payment`,
    data: formData,
    maxRetries: 3,
  });

  return { invoice: updatedInvoice, payment };
}
