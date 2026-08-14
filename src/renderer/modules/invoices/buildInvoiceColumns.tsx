import type { Dispatch, SetStateAction } from 'react';
import {
  Send, Download, Trash2, DollarSign, Eye, Pencil, Receipt, Mail,
} from 'lucide-react';
import { EmailSentCountBadge, emailSentLabel } from '../../shared/components/email/EmailSentCountBadge';
import { cn } from '../../shared/utils/cn';
import { formatShiftDate } from '../../shared/utils/formatDateTime';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import type { Invoice } from './api/InvoiceTypes';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  InvoiceIconAction,
  balanceDue,
  displayStatus,
  invoicePartyLabel,
  isOverdue,
  isReceivedInvoice,
} from './invoiceListHelpers';

type InvoiceView = 'list' | 'create' | 'edit';

interface BuildInvoiceColumnsArgs {
  busyAction: { id: number; type: string } | null;
  setBusyAction: Dispatch<SetStateAction<{ id: number; type: string } | null>>;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  setView: Dispatch<SetStateAction<InvoiceView>>;
  setPaymentModal: Dispatch<SetStateAction<Invoice | null>>;
  setEmailTarget: Dispatch<SetStateAction<Invoice | null>>;
  runRowAction: (invoiceId: number, type: string, fn: () => void) => void;
  handlePdfAction: (invoiceId: number, type: 'view' | 'download') => void;
  sendInvoice: { mutate: (id: number, opts: { onSettled: () => void }) => void };
  deleteInvoice: { mutate: (id: number, opts: { onSettled: () => void }) => void };
}

export function buildInvoiceColumns({
  busyAction,
  setBusyAction,
  setEditingId,
  setView,
  setPaymentModal,
  setEmailTarget,
  runRowAction,
  handlePdfAction,
  sendInvoice,
  deleteInvoice,
}: BuildInvoiceColumnsArgs) {
  return [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (item: Invoice) => (
        <div className="min-w-0">
          <span className="font-mono text-sm font-semibold text-gray-900">{item.invoice_number}</span>
          {isReceivedInvoice(item) ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-600 mt-0.5">From supplier</p>
          ) : null}
          {item.purchase_order?.po_number ? (
            <p className="text-[10px] text-gray-400 mt-0.5">PO {item.purchase_order.po_number}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Party',
      render: (item: Invoice) => (
        <div className="min-w-0">
          <span className={cn('text-sm', invoicePartyLabel(item) !== 'Walk-in' ? 'text-gray-800' : 'text-gray-400 italic')}>
            {invoicePartyLabel(item)}
          </span>
          {isReceivedInvoice(item) ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-600 mt-0.5">Supplier</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'issue_date',
      header: 'Issued',
      render: (item: Invoice) => (
        <span className="text-sm text-gray-600 tabular-nums">{formatShiftDate(item.issue_date)}</span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due',
      render: (item: Invoice) => {
        const overdue = isOverdue(item);
        return (
          <span className={cn('text-sm tabular-nums', overdue ? 'text-red-600 font-medium' : 'text-gray-600')}>
            {formatShiftDate(item.due_date)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Invoice) => {
        const status = displayStatus(item);
        return (
          <div className="min-w-[7rem]">
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              INVOICE_STATUS_STYLES[status] || INVOICE_STATUS_STYLES.draft,
            )}>
              {INVOICE_STATUS_LABELS[status] || status}
            </span>
            {item.status === 'draft' && !isReceivedInvoice(item) && (
              <p className="text-[10px] text-gray-400 mt-1 leading-tight">Send to post to accounting</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right' as const,
      render: (item: Invoice) => (
        <span className="text-sm font-medium text-gray-900 tabular-nums">{formatCurrency(item.total_amount)}</span>
      ),
    },
    {
      key: 'amount_paid',
      header: 'Paid',
      align: 'right' as const,
      render: (item: Invoice) => (
        <span className="text-sm text-gray-600 tabular-nums">{formatCurrency(item.amount_paid || 0)}</span>
      ),
    },
    {
      key: 'balance_due',
      header: 'Balance',
      align: 'right' as const,
      render: (item: Invoice) => {
        const due = balanceDue(item);
        return (
          <span className={cn(
            'text-sm font-semibold tabular-nums',
            due > 0 ? 'text-red-600' : 'text-green-600',
          )}>
            {formatCurrency(due)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (item: Invoice) => {
        const rowBusy = busyAction?.id === item.id;
        const received = isReceivedInvoice(item);
        const canPay = item.status === 'sent' || item.status === 'partially_paid' || isOverdue(item);
        const paymentCount = item.payments?.length ?? 0;
        const emailSentCount = item.email_sent_count ?? 0;

        return (
          <div
            className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50/80 p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {!received && item.status === 'draft' && (
              <>
                <InvoiceIconAction
                  title="Edit draft"
                  disabled={busyAction !== null}
                  onClick={() => {
                    setEditingId(item.id);
                    setView('edit');
                  }}
                  className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </InvoiceIconAction>
                <InvoiceIconAction
                  title="Send invoice (posts to accounting)"
                  loading={rowBusy && busyAction?.type === 'send'}
                  disabled={busyAction !== null && !rowBusy}
                  onClick={() => runRowAction(item.id, 'send', () => {
                    sendInvoice.mutate(item.id, { onSettled: () => setBusyAction(null) });
                  })}
                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </InvoiceIconAction>
              </>
            )}
            {(canPay && balanceDue(item) > 0) || ((item.amount_paid || 0) > 0 && item.status !== 'draft') ? (
              <InvoiceIconAction
                title={
                  received
                    ? paymentCount > 0
                      ? `View payment receipts (${paymentCount})`
                      : 'View payment status'
                    : paymentCount > 0
                      ? `Payment history & receipts (${paymentCount})`
                      : balanceDue(item) > 0
                        ? 'Payments - record or view history'
                        : 'Payment history & receipts'
                }
                disabled={busyAction !== null}
                onClick={() => setPaymentModal(item)}
                className="text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <span className="relative inline-flex">
                  {received || balanceDue(item) <= 0 ? (
                    <Receipt className="w-3.5 h-3.5" />
                  ) : (
                    <DollarSign className="w-3.5 h-3.5" />
                  )}
                  {paymentCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {paymentCount}
                    </span>
                  )}
                </span>
              </InvoiceIconAction>
            ) : null}
            <InvoiceIconAction
              title="View PDF"
              loading={rowBusy && busyAction?.type === 'view'}
              disabled={busyAction !== null && !rowBusy}
              onClick={() => void handlePdfAction(item.id, 'view')}
            >
              <Eye className="w-3.5 h-3.5" />
            </InvoiceIconAction>
            <InvoiceIconAction
              title="Download PDF"
              loading={rowBusy && busyAction?.type === 'download'}
              disabled={busyAction !== null && !rowBusy}
              onClick={() => void handlePdfAction(item.id, 'download')}
            >
              <Download className="w-3.5 h-3.5" />
            </InvoiceIconAction>
            {!received && (
              <InvoiceIconAction
                title={emailSentLabel(emailSentCount)}
                disabled={busyAction !== null}
                onClick={() => setEmailTarget(item)}
                className="text-violet-600 hover:bg-violet-50 hover:text-violet-700"
              >
                <span className="relative inline-flex">
                  <Mail className="w-3.5 h-3.5" />
                  <EmailSentCountBadge count={emailSentCount} />
                </span>
              </InvoiceIconAction>
            )}
            {!received && (item.status === 'draft' || item.status === 'cancelled') && (
              <InvoiceIconAction
                title="Delete invoice"
                loading={rowBusy && busyAction?.type === 'delete'}
                disabled={busyAction !== null && !rowBusy}
                onClick={() => runRowAction(item.id, 'delete', () => {
                  deleteInvoice.mutate(item.id, { onSettled: () => setBusyAction(null) });
                })}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </InvoiceIconAction>
            )}
          </div>
        );
      },
    },
  ];
}
