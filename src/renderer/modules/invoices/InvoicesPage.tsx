import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';
import { useToast } from '../../app/contexts/useToast';

import { useInvoices, useSendInvoice, useDeleteInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import NewInvoiceBuilder from './NewInvoiceBuilder';
import RecordPaymentModal from './RecordPaymentModal';
import { viewInvoicePdf, downloadInvoicePdf } from './useInvoicePdf';
import {
  FileText, Plus, Send, Download, Trash2, DollarSign, Search,
  ShoppingCart, ArrowRight, List, Eye, Info, AlertCircle,
} from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { formatShiftDate } from '../../shared/utils/formatDateTime';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { ROUTES } from '../../app/routes/constants/shared.paths';

type InvoiceView = 'list' | 'create';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  sent: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  paid: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  partially_paid: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  overdue: 'bg-red-100 text-red-800 ring-1 ring-red-300 font-semibold',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

function balanceDue(inv: Invoice): number {
  return Math.max(0, inv.total_amount - (inv.amount_paid || 0));
}

function isOverdue(inv: Invoice): boolean {
  if (inv.status === 'paid' || inv.status === 'cancelled') return false;
  if (balanceDue(inv) <= 0) return false;
  const due = new Date(inv.due_date);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function displayStatus(inv: Invoice): string {
  if (isOverdue(inv) && inv.status !== 'overdue') return 'overdue';
  return inv.status;
}

function IconAction({
  title,
  onClick,
  loading,
  disabled,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors',
        'hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      ) : children}
    </button>
  );
}

export default function InvoicesPage() {
  const [view, setView] = useState<InvoiceView>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [busyAction, setBusyAction] = useState<{ id: number; type: string } | null>(null);

  const { showToast } = useToast();
  const { data: invoices, isLoading } = useInvoices();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  const sorted = useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort(
      (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime(),
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((inv) => {
      const status = displayStatus(inv);
      if (statusFilter && status !== statusFilter) return false;
      if (q && !inv.invoice_number.toLowerCase().includes(q) && !(inv.customer?.name ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [sorted, search, statusFilter]);

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const drafts = list.filter((i) => i.status === 'draft').length;
    const outstanding = list.reduce((sum, i) => sum + balanceDue(i), 0);
    const overdueCount = list.filter((i) => isOverdue(i)).length;
    return { total: list.length, drafts, outstanding, overdueCount };
  }, [invoices]);

  const handlePdfAction = useCallback(async (invoiceId: number, type: 'view' | 'download') => {
    setBusyAction({ id: invoiceId, type });
    try {
      if (type === 'view') await viewInvoicePdf(invoiceId);
      else await downloadInvoicePdf(invoiceId);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to open invoice PDF');
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  const runRowAction = useCallback((
    invoiceId: number,
    type: string,
    fn: () => void,
  ) => {
    setBusyAction({ id: invoiceId, type });
    fn();
  }, []);

  const columns = useMemo(() => [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (item: Invoice) => (
        <span className="font-mono text-sm font-semibold text-gray-900">{item.invoice_number}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Invoice) => (
        <span className={cn('text-sm', item.customer?.name ? 'text-gray-800' : 'text-gray-400 italic')}>
          {item.customer?.name ?? 'Walk-in'}
        </span>
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
              STATUS_STYLES[status] || STATUS_STYLES.draft,
            )}>
              {STATUS_LABELS[status] || status}
            </span>
            {item.status === 'draft' && (
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
        const canPay = item.status === 'sent' || item.status === 'partially_paid' || isOverdue(item);

        return (
          <div
            className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50/80 p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {item.status === 'draft' && (
              <IconAction
                title="Send invoice (posts to accounting)"
                loading={rowBusy && busyAction?.type === 'send'}
                disabled={busyAction !== null && !rowBusy}
                onClick={() => runRowAction(item.id, 'send', () => {
                  sendInvoice.mutate(item.id, { onSettled: () => setBusyAction(null) });
                })}
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Send className="w-3.5 h-3.5" />
              </IconAction>
            )}
            {canPay && balanceDue(item) > 0 && (
              <IconAction
                title="Record payment"
                disabled={busyAction !== null}
                onClick={() => setPaymentModal(item)}
                className="text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <DollarSign className="w-3.5 h-3.5" />
              </IconAction>
            )}
            <IconAction
              title="View PDF"
              loading={rowBusy && busyAction?.type === 'view'}
              disabled={busyAction !== null && !rowBusy}
              onClick={() => void handlePdfAction(item.id, 'view')}
            >
              <Eye className="w-3.5 h-3.5" />
            </IconAction>
            <IconAction
              title="Download PDF"
              loading={rowBusy && busyAction?.type === 'download'}
              disabled={busyAction !== null && !rowBusy}
              onClick={() => void handlePdfAction(item.id, 'download')}
            >
              <Download className="w-3.5 h-3.5" />
            </IconAction>
            {(item.status === 'draft' || item.status === 'cancelled') && (
              <IconAction
                title="Delete invoice"
                loading={rowBusy && busyAction?.type === 'delete'}
                disabled={busyAction !== null && !rowBusy}
                onClick={() => runRowAction(item.id, 'delete', () => {
                  deleteInvoice.mutate(item.id, { onSettled: () => setBusyAction(null) });
                })}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </IconAction>
            )}
          </div>
        );
      },
    },
  ], [busyAction, deleteInvoice, handlePdfAction, runRowAction, sendInvoice]);

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'partially_paid', label: 'Partially paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {view === 'list'
                  ? 'Create → Send (accounting) → Record payment'
                  : 'Add products and create a draft invoice'}
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                view === 'list'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <List className="w-4 h-4" />
              Invoice list
            </button>
            <button
              type="button"
              onClick={() => setView('create')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                view === 'create'
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Plus className="w-4 h-4" />
              New invoice
            </button>
          </div>
        </div>

        {view === 'list' && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 border-t border-gray-200">
            {[
              { label: 'Total', value: String(stats.total) },
              { label: 'Drafts', value: String(stats.drafts) },
              { label: 'Outstanding', value: formatCurrency(stats.outstanding) },
              { label: 'Overdue', value: String(stats.overdueCount), warn: stats.overdueCount > 0 },
            ].map(({ label, value, warn }) => (
              <div key={label} className="bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className={cn('text-sm font-semibold mt-0.5 tabular-nums', warn ? 'text-red-600' : 'text-gray-900')}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {view === 'create' ? (
        <Card className="p-5">
          <NewInvoiceBuilder onCreated={() => setView('list')} />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search invoice # or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">
                {filtered.length} of {stats.total}
              </span>
            </div>
          </div>

          {stats.drafts > 0 && !statusFilter && (
            <div className="flex items-start gap-2 border-b border-blue-100 bg-blue-50/80 px-4 py-2.5 text-sm text-blue-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>{stats.drafts}</strong> draft{stats.drafts !== 1 ? 's' : ''} — use{' '}
                <Send className="w-3.5 h-3.5 inline -mt-0.5" /> Send to post revenue and receivables to accounting.
              </span>
            </div>
          )}

          {stats.overdueCount > 0 && !statusFilter && (
            <div className="flex items-start gap-2 border-b border-red-100 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>{stats.overdueCount}</strong> overdue invoice{stats.overdueCount !== 1 ? 's' : ''} — follow up or record payment.
              </span>
            </div>
          )}

          {/* Table / states */}
          <div className="p-4 pt-3">
            {isLoading ? (
              <Table columns={columns} data={[]} loading rowKey={(item) => item.id} />
            ) : stats.total === 0 ? (
              <div className="py-10 px-4 text-center max-w-md mx-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileText className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">No invoices yet</h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  Create a draft here or from the Sales page, then send it to the customer.
                </p>
                <div className="space-y-3 text-left text-sm">
                  <button
                    type="button"
                    onClick={() => setView('create')}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      <span className="font-medium text-gray-900 block">New invoice</span>
                      <span className="text-gray-500 text-xs">Search products and build a draft</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                  </button>
                  <Link
                    to={ROUTES.SALES.NEW}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      <span className="font-medium text-gray-900 block">From Sales</span>
                      <span className="text-gray-500 text-xs">Generate invoice from the cart</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                  </Link>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-700">No matching invoices</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search or clear the status filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { setSearch(''); setStatusFilter(''); }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="-mx-1">
                <Table columns={columns} data={filtered} loading={false} rowKey={(item) => item.id} />
              </div>
            )}
          </div>
        </Card>
      )}

      {paymentModal && (
        <RecordPaymentModal
          invoice={paymentModal}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
}
