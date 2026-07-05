import { useMemo, useState } from 'react';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';

import { useInvoices, useSendInvoice, useDeleteInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import InvoiceFormPage from './InvoiceFormPage';
import RecordPaymentModal from './RecordPaymentModal';
import { FileText, Plus, Send, Download, Trash2, DollarSign, Search } from 'lucide-react';
import { cn } from '../../shared/utils/cn';
import { formatShiftDate } from '../../shared/utils/formatDateTime';
import { formatCurrency } from '../../shared/utils/formatCurrency';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  overdue: 'bg-red-100 text-red-700 font-semibold',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

export default function InvoicesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const { data: invoices, isLoading } = useInvoices();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (q && !inv.invoice_number.toLowerCase().includes(q) && !(inv.customer?.name ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [invoices, search, statusFilter]);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const balanceDue = (inv: Invoice) => inv.total_amount - (inv.amount_paid || 0);

  const columns = [
    { key: 'invoice_number', header: 'Invoice #' },
    {
      key: 'customer',
      header: 'Customer',
      render: (item: Invoice) => item.customer?.name ?? '—',
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      render: (item: Invoice) => formatShiftDate(item.issue_date),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (item: Invoice) => formatShiftDate(item.due_date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Invoice) => (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-700')}>
          {STATUS_LABELS[item.status] || item.status}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total',
      align: 'right' as const,
      render: (item: Invoice) => formatCurrency(item.total_amount),
    },
    {
      key: 'balance_due',
      header: 'Balance Due',
      align: 'right' as const,
      render: (item: Invoice) => {
        const due = balanceDue(item);
        return (
          <span className={due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            {formatCurrency(due)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (item: Invoice) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {item.status === 'draft' && (
            <Button
              size="sm" variant="ghost"
              onClick={() => { setActionId(item.id); sendInvoice.mutate(item.id, { onSettled: () => setActionId(null) }); }}
              loading={actionId === item.id && sendInvoice.isPending}
              disabled={actionId !== null}
              title="Send Invoice"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
          {(item.status === 'sent' || item.status === 'partially_paid') && (
            <Button
              size="sm" variant="ghost"
              onClick={() => setPaymentModal(item)}
              disabled={actionId !== null}
              title="Record Payment"
            >
              <DollarSign className="w-3.5 h-3.5 text-green-600" />
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            onClick={() => window.open(`/invoices/${item.id}/pdf`, '_blank')}
            disabled={actionId !== null}
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {(item.status === 'draft' || item.status === 'cancelled') && (
            <Button
              size="sm" variant="ghost"
              onClick={() => { setActionId(item.id); deleteInvoice.mutate(item.id, { onSettled: () => setActionId(null) }); }}
              loading={actionId === item.id && deleteInvoice.isPending}
              disabled={actionId !== null}
              title="Delete"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
              <p className="text-sm text-gray-500">Create and manage invoices for your customers</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Invoice
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}</span>
      </div>

      <Table columns={columns} data={filtered} loading={isLoading} rowKey={(item) => item.id} />

      {formOpen && <InvoiceFormPage onClose={() => setFormOpen(false)} />}
      {paymentModal && (
        <RecordPaymentModal
          invoice={paymentModal}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
}
