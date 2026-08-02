import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../shared/components/cards/Card';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { useToast } from '../../app/contexts/useToast';

import { useInvoices, useSendInvoice, useDeleteInvoice } from './api/InvoiceQueries';
import type { Invoice } from './api/InvoiceTypes';
import NewInvoiceBuilder from './NewInvoiceBuilder';
import EditInvoiceDraftPanel from './EditInvoiceDraftPanel';
import RecordPaymentModal from './RecordPaymentModal';
import ViewInvoiceModal from './ViewInvoiceModal';
import { InvoicesPageHeader } from './InvoicesPageHeader';
import { viewInvoicePdf, downloadInvoicePdf } from './useInvoicePdf';
import {
  FileText, Plus, Search,
  ShoppingCart, ArrowRight, Info, AlertCircle, Store,
} from 'lucide-react';
import SendDocumentEmailModal from '../../shared/components/email/SendDocumentEmailModal';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { balanceDue, displayStatus, invoicePartyLabel, isOverdue, isReceivedInvoice } from './invoiceListHelpers';
import { buildInvoiceColumns } from './buildInvoiceColumns';
import BranchFilter from '../../shared/components/filters/BranchFilter';

type InvoiceView = 'list' | 'create' | 'edit';
export type InvoicesPageMode = 'sales' | 'supplier';

interface InvoicesPageProps {
  /** sales = issued AR; supplier = received AP (view-only payments). */
  mode?: InvoicesPageMode;
}

export default function InvoicesPage({ mode = 'sales' }: InvoicesPageProps) {
  const isSupplierMode = mode === 'supplier';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<InvoiceView>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'issued' | 'received'>('issued');
  const [localPaymentModal, setLocalPaymentModal] = useState<Invoice | null>(null);
  const [localViewInvoiceId, setLocalViewInvoiceId] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [busyAction, setBusyAction] = useState<{ id: number; type: string } | null>(null);

  const { showToast } = useToast();
  const {
    data: invoices,
    isLoading,
    isFetching,
    refetch,
  } = useInvoices(
    isSupplierMode ? { direction: 'received' } : { direction: 'issued' },
  );
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();

  /** Supplier mode is list-only; sales mode keeps create/edit. */
  const effectiveView: InvoiceView = isSupplierMode ? 'list' : view;

  const sorted = useMemo(() => {
    if (!invoices) return [];
    return [...invoices].sort(
      (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime(),
    );
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const poParam = searchParams.get('po');
    const branchId = branchFilter ? Number(branchFilter) : null;
    return sorted.filter((inv) => {
      const status = displayStatus(inv);
      if (statusFilter && status !== statusFilter) return false;
      if (branchId && inv.location_id !== branchId) return false;
      if (isSupplierMode || directionFilter === 'received') {
        if (!isReceivedInvoice(inv)) return false;
      } else if (directionFilter === 'issued') {
        if (isReceivedInvoice(inv)) return false;
      }
      if (poParam && String(inv.purchase_order_id ?? '') !== poParam) return false;
      if (
        q
        && !inv.invoice_number.toLowerCase().includes(q)
        && !invoicePartyLabel(inv).toLowerCase().includes(q)
        && !(inv.purchase_order?.po_number ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [sorted, search, statusFilter, directionFilter, searchParams, isSupplierMode, branchFilter]);

  const paginated = usePagination(filtered, 15);

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const drafts = list.filter((i) => i.status === 'draft' && !isReceivedInvoice(i)).length;
    const outstanding = list.reduce((sum, i) => sum + balanceDue(i), 0);
    const overdueCount = list.filter((i) => isOverdue(i)).length;
    return { total: list.length, drafts, outstanding, overdueCount };
  }, [invoices]);

  const urlInvoiceId = Number(searchParams.get('invoice') || 0) || null;
  const urlFocusPayments = searchParams.get('focus') === 'payments';
  const urlInvoice = useMemo(() => {
    if (!urlInvoiceId || !invoices?.length) return null;
    return invoices.find((i) => i.id === urlInvoiceId) ?? null;
  }, [urlInvoiceId, invoices]);

  const canRecordFromUrl = Boolean(
    urlInvoice
    && urlFocusPayments
    && !isSupplierMode
    && !isReceivedInvoice(urlInvoice),
  );
  const paymentModal = localPaymentModal ?? (canRecordFromUrl ? urlInvoice : null);
  const viewInvoiceId = localViewInvoiceId
    ?? (urlInvoiceId && urlInvoice && !canRecordFromUrl && !localPaymentModal ? urlInvoiceId : null);

  const clearInvoiceDeepLink = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('invoice');
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearPoFilter = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('po');
    next.delete('invoice');
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const columns = useMemo(
    () => buildInvoiceColumns({
      busyAction,
      setBusyAction,
      setEditingId,
      setView,
      setPaymentModal: setLocalPaymentModal,
      setEmailTarget,
      runRowAction,
      handlePdfAction,
      sendInvoice,
      deleteInvoice,
    }),
    [busyAction, deleteInvoice, handlePdfAction, runRowAction, sendInvoice],
  );

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'partially_paid', label: 'Partially paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const poFilter = searchParams.get('po');
  const pageTitle = isSupplierMode ? 'Supplier invoices' : 'Sales invoices';
  const pageSubtitle = isSupplierMode
    ? 'Invoices from suppliers. View PDFs and payment receipts — only the seller records payments.'
    : effectiveView === 'list'
      ? 'Invoices you issue to customers. Record payments and send receipts here.'
      : effectiveView === 'edit'
        ? 'Edit draft items, customer, and dates'
        : 'Add products and create a draft invoice';

  return (
    <div className="space-y-5">
      <InvoicesPageHeader
        isSupplierMode={isSupplierMode}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        effectiveView={effectiveView}
        isFetching={isFetching}
        stats={stats}
        onRefresh={() => void refetch()}
        onShowList={() => { setView('list'); setEditingId(null); }}
        onShowCreate={() => { setView('create'); setEditingId(null); }}
        onExploreMarketplace={() => navigate(ROUTES.INVENTORY.MARKETPLACE)}
      />

      {effectiveView === 'edit' && editingId && !isSupplierMode ? (
        <Card className="p-5">
          <EditInvoiceDraftPanel
            invoiceId={editingId}
            onSaved={() => { setView('list'); setEditingId(null); }}
            onCancel={() => { setView('list'); setEditingId(null); }}
          />
        </Card>
      ) : effectiveView === 'create' && !isSupplierMode ? (
        <Card className="p-5">
          <NewInvoiceBuilder onCreated={() => setView('list')} />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder={isSupplierMode ? 'Search invoice #, supplier, or PO…' : 'Search invoice #, customer, or PO…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isSupplierMode ? (
                <select
                  aria-label="Filter by direction"
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value as 'all' | 'issued' | 'received')}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="issued">Sales invoices</option>
                  <option value="all">All (incl. received)</option>
                  <option value="received">Received only</option>
                </select>
              ) : null}
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {statusOptions.filter((opt) => !(isSupplierMode && opt.value === 'draft')).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <BranchFilter value={branchFilter} onChange={setBranchFilter} />
              <span className="hidden sm:inline text-xs text-gray-400 whitespace-nowrap">
                {filtered.length} of {stats.total}
              </span>
            </div>
          </div>

          {poFilter ? (
            <div className="flex items-center justify-between gap-2 border-b border-violet-100 bg-violet-50/80 px-4 py-2.5 text-sm text-violet-900">
              <span>Showing invoices for purchase order #{poFilter}</span>
              <Button type="button" size="sm" variant="secondary" onClick={clearPoFilter}>
                Clear PO filter
              </Button>
            </div>
          ) : null}

          {stats.drafts > 0 && !statusFilter && !isSupplierMode && (
            <div className="flex items-start gap-2 border-b border-blue-100 bg-blue-50/80 px-4 py-2.5 text-sm text-blue-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>{stats.drafts}</strong> draft{stats.drafts !== 1 ? 's' : ''} — edit then send to post to accounting.
              </span>
            </div>
          )}

          {stats.overdueCount > 0 && !statusFilter && (
            <div className="flex items-start gap-2 border-b border-red-100 bg-red-50/80 px-4 py-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>{stats.overdueCount}</strong> overdue invoice{stats.overdueCount !== 1 ? 's' : ''}
                {isSupplierMode ? ' — awaiting seller payment recording.' : ' — follow up or record payment.'}
              </span>
            </div>
          )}

          <div className="p-4 pt-3">
            {isLoading ? (
              <Table columns={columns} data={[]} loading rowKey={(item) => item.id} />
            ) : stats.total === 0 ? (
              <div className="py-10 px-4 text-center max-w-md mx-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileText className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isSupplierMode ? 'No supplier invoices yet' : 'No sales invoices yet'}
                </h2>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  {isSupplierMode
                    ? 'When a supplier accepts your purchase order, their invoice appears here.'
                    : 'Create a draft, or accept an incoming purchase order to auto-create an invoice for the buyer.'}
                </p>
                {isSupplierMode ? (
                  <Button type="button" onClick={() => navigate(ROUTES.INVENTORY.MARKETPLACE)}>
                    <Store className="mr-1.5 h-4 w-4" />
                    Explore marketplace
                  </Button>
                ) : (
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
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-gray-700">No matching invoices</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search or clear filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('');
                    setBranchFilter('');
                    setDirectionFilter(isSupplierMode ? 'received' : 'issued');
                    clearPoFilter();
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="-mx-1">
                  <Table columns={columns} data={paginated.data} loading={false} rowKey={(item) => item.id} />
                </div>
                <div className="flex items-center justify-between mt-4 px-1">
                  <Pagination
                    currentPage={paginated.page}
                    totalPages={paginated.totalPages}
                    totalItems={paginated.totalItems}
                    pageSize={paginated.pageSize}
                    onPageChange={paginated.setPage}
                    onPageSizeChange={paginated.setPageSize}
                  />
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {paymentModal && (
        <RecordPaymentModal
          invoice={paymentModal}
          viewOnly={isSupplierMode || isReceivedInvoice(paymentModal)}
          onClose={() => {
            setLocalPaymentModal(null);
            clearInvoiceDeepLink();
          }}
        />
      )}

      {viewInvoiceId ? (
        <ViewInvoiceModal
          invoiceId={viewInvoiceId}
          isOpen
          onClose={() => {
            setLocalViewInvoiceId(null);
            clearInvoiceDeepLink();
          }}
          role={isSupplierMode ? 'buyer' : 'seller'}
        />
      ) : null}

      {emailTarget && !isSupplierMode && (
        <SendDocumentEmailModal
          open
          onClose={() => setEmailTarget(null)}
          documentType="invoice"
          documentId={emailTarget.id}
          documentLabel={`Invoice ${emailTarget.invoice_number}`}
          customerName={emailTarget.customer?.name}
          defaultEmail={emailTarget.customer?.email}
          emailSentCount={emailTarget.email_sent_count ?? 0}
          onSent={(result) => {
            setEmailTarget((prev) => prev
              ? { ...prev, email_sent_count: result.email_sent_count, last_emailed_at: result.last_emailed_at ?? null }
              : null);
          }}
        />
      )}
    </div>
  );
}
