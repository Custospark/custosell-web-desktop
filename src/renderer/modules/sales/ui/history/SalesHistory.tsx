import { useState, useMemo, useCallback } from 'react';
import { useSales } from '../../api/salesQueries';
import { useInvoices } from '../../../invoices/api/InvoiceQueries';
import { findInvoiceBySaleId } from '../../../invoices/invoiceUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { FiscalStatusBadge } from '../../../../shared/components/badges/FiscalStatusBadge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { SearchInput } from '../../../../shared/components/inputs/SearchInput';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { RotateCcw, Trash2, CheckSquare, Square, WifiOff, DollarSign, FileText, Mail } from 'lucide-react';
import SendDocumentEmailModal from '../../../../shared/components/email/SendDocumentEmailModal';
import { EmailSentCountBadge, emailSentLabel } from '../../../../shared/components/email/EmailSentCountBadge';
import { saleDocumentEmailCount, saleEmailDocumentTarget } from '../../../../shared/utils/customerContactUtils';
import type { SendDocumentEmailResult } from '../../../../shared/hooks/useDocumentEmail';
import type { DocumentEmailType } from '../../../../shared/components/email/SendDocumentEmailModal';
import InvoiceFromSaleModal from '../InvoiceFromSaleModal';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import SalePaymentsModal from './SalePaymentsModal';
import { grossSaleAmount, netSaleAmount, refundedAmount } from '../../utils/saleAmounts';
import { computeSaleBalance } from '../../../payments/payableBalance';
import type { Sale } from '../../api/salesTypes';
import type { Invoice } from '../../../invoices/api/InvoiceTypes';
import type { SaleWithSyncMeta } from '../../../../app/store/offline/sales/localSalesStore';
import BranchFilter from '../../../../shared/components/filters/BranchFilter';

export default function SalesHistory() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: sales = [], isLoading, error, refetch, isFetching } = useSales();
  const { data: invoices = [] } = useInvoices();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [paymentsSale, setPaymentsSale] = useState<Sale | null>(null);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [existingInvoiceForSale, setExistingInvoiceForSale] = useState<Invoice | null>(null);
  const [emailSale, setEmailSale] = useState<Sale | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    documentType: DocumentEmailType;
    documentId: number;
    documentLabel: string;
    emailSentCount: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await axiosInstance.post('/sales/bulk-delete', { ids });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      setSelectedIds(new Set());
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const filtered = useMemo(() => {
    if (!sales) return [];
    const safe = sales.filter(Boolean) as SaleWithSyncMeta[];
    const branchId = branchFilter ? Number(branchFilter) : null;
    return safe.filter((s) => {
      if (branchId && s.location_id !== branchId) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.receipt_number.toLowerCase().includes(q);
    });
  }, [sales, search, branchFilter]);

  const paginated = usePagination(filtered, 15);

  const allSelected = paginated.data.length > 0 && paginated.data.every((s) => selectedIds.has(s.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.data.map((s) => s.id)));
    }
  }, [allSelected, paginated.data]);

  const handleInvoiceClick = useCallback((sale: Sale) => {
    const existing = findInvoiceBySaleId(invoices, sale.id);
    setExistingInvoiceForSale(existing ?? null);
    setInvoiceSale(sale);
  }, [invoices]);

  const handleCloseInvoiceModal = useCallback(() => {
    setInvoiceSale(null);
    setExistingInvoiceForSale(null);
  }, []);

  const openSaleEmail = useCallback((sale: Sale) => {
    const linkedInvoice = findInvoiceBySaleId(invoices, sale.id);
    const target = saleEmailDocumentTarget(sale, linkedInvoice);
    if (!target) return;
    setEmailSale(sale);
    setEmailTarget(target);
  }, [invoices]);

  const handleEmailSent = useCallback((result: SendDocumentEmailResult) => {
    if (!emailTarget) return;
    setEmailTarget((prev) => prev ? { ...prev, emailSentCount: result.email_sent_count } : null);
    void refetch();
  }, [emailTarget, refetch]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Delete sales?',
      message: `This will permanently delete ${selectedIds.size} sale(s). This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const netRevenue = filtered.reduce((s, sale) => s + netSaleAmount(sale), 0);
  const totalRefunds = filtered.reduce((s, sale) => s + refundedAmount(sale), 0);

  if (!sales?.length && (isLoading || isFetching)) return <LoadingSkeleton variant="table" />;

  if (error && !sales?.length) {
    return (
      <EmptyState
        icon={<WifiOff className="w-12 h-12" />}
        title={isOffline ? 'Showing offline sales only' : 'Failed to load sales'}
        description={
          isOffline
            ? 'Cached sales are unavailable. Complete new sales offline — they will appear here and sync when you reconnect.'
            : 'Check your connection and try again.'
        }
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} sale(s) · Net <span className="font-semibold text-gray-600">{formatCurrency(netRevenue)}</span>
            {totalRefunds > 0 && <> · Refunds <span className="font-semibold text-gray-600">-{formatCurrency(totalRefunds)}</span></>}
            {isOffline && ' · Offline mode'}
            {isFetching && !isLoading && ' · Updating…'}
          </p>
        </div>
        <button title="Refresh sales" onClick={handleRefresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
          <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
        <div className="w-full sm:flex-1 sm:min-w-0">
          <SearchInput placeholder="Search receipt/sale by receipt number" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
        <BranchFilter className="w-full sm:w-auto" value={branchFilter} onChange={setBranchFilter} />
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2">
          <button onClick={toggleAll} title="Select all" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
            Select All
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleteMutation.isPending}
              className="hidden items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium">
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <Table<SaleWithSyncMeta>
        rowKey={(s) => s.id}
        columns={[
          { key: 'select', header: '', render: (s) => (
            <button onClick={() => toggleOne(s.id)} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
              {selectedIds.has(s.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
            </button>
          )},
          { key: 'receipt_number', header: 'Receipt', render: (s: SaleWithSyncMeta) => (
            <div className="flex items-center gap-2">
              <span>{s.receipt_number}</span>
              {s._pendingSync && (
                <Badge variant="warning">Pending sync</Badge>
              )}
              {s._pendingRefundSync && (
                <Badge variant="warning">Refund pending</Badge>
              )}
              <FiscalStatusBadge status={s.fiscal_status} />
            </div>
          )},
          { key: 'sale_date', header: 'Date', render: (s) => new Date(s.sale_date).toLocaleDateString() },
          { key: 'total_amount', header: 'Net Total', render: (s) => (
            <div>
              <span className="font-semibold">{formatCurrency(netSaleAmount(s))}</span>
              {refundedAmount(s) > 0 && (
                <p className="text-xs text-gray-400">Gross {formatCurrency(grossSaleAmount(s))}</p>
              )}
            </div>
          )},
          { key: 'payment_status', header: 'Status', render: (s) => {
            const balance = computeSaleBalance(s);
            if (s.payment_status === 'refunded') return <Badge variant="danger">Full Refund</Badge>;
            if (s.payment_status === 'partially_refunded') return <Badge variant="warning">Partially Refunded</Badge>;
            if (s.payment_status === 'partially_paid' || balance > 0.009) {
              return (
                <div>
                  <Badge variant="warning">Partially Paid</Badge>
                  <p className="text-[10px] text-amber-700 mt-0.5 tabular-nums">{formatCurrency(balance)} due</p>
                </div>
              );
            }
            return <Badge variant="success">Paid</Badge>;
          }},
          { key: 'actions', header: 'Actions', render: (s) => {
            const balance = computeSaleBalance(s);
            const hasBalance = balance > 0.009;
            const paymentCount = s.payments?.length ?? 0;
            const hasPayments = paymentCount > 0 || s.payment_status === 'partially_paid';
            const hasItems = (s.sale_items?.length ?? 0) > 0;
            const canInvoice = s.id > 0 && hasItems && s.payment_status !== 'refunded';
            const linkedInvoice = findInvoiceBySaleId(invoices, s.id);
            const emailCount = saleDocumentEmailCount(s, linkedInvoice);
            const emailDoc = saleEmailDocumentTarget(s, linkedInvoice);
            return (
            <div className="flex gap-1">
              {canInvoice && (
                <button
                  title={
                    linkedInvoice
                      ? `View linked invoice ${linkedInvoice.invoice_number}`
                      : 'Create billing invoice for this sale'
                  }
                  onClick={() => handleInvoiceClick(s)}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                </button>
              )}
              {(hasBalance || hasPayments) && (
                <button title={`Payment history (${paymentCount})`} onClick={() => setPaymentsSale(s)} className="relative p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                  <DollarSign className="w-4 h-4" />
                  {paymentCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {paymentCount}
                    </span>
                  )}
                </button>
              )}
              {emailDoc && s.id > 0 && (
                <button
                  title={emailSentLabel(emailCount)}
                  onClick={() => openSaleEmail(s)}
                  className="relative p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <EmailSentCountBadge count={emailCount} />
                </button>
              )}
            </div>
            );
          }},
        ]}
        data={paginated.data}
      />
      <div className="flex items-center justify-between mt-4">
        <Pagination currentPage={paginated.page} totalPages={paginated.totalPages} totalItems={paginated.totalItems} pageSize={paginated.pageSize} onPageChange={paginated.setPage} onPageSizeChange={paginated.setPageSize} />
      </div>
      {paymentsSale && (
        <SalePaymentsModal sale={paymentsSale} open={!!paymentsSale} onClose={() => setPaymentsSale(null)} />
      )}
      {invoiceSale && (
        <InvoiceFromSaleModal
          open={!!invoiceSale}
          linkedSale={invoiceSale}
          existingInvoice={existingInvoiceForSale}
          onClose={handleCloseInvoiceModal}
          onSuccess={handleCloseInvoiceModal}
        />
      )}
      {emailSale && emailTarget && (
        <SendDocumentEmailModal
          open
          onClose={() => { setEmailSale(null); setEmailTarget(null); }}
          documentType={emailTarget.documentType}
          documentId={emailTarget.documentId}
          documentLabel={emailTarget.documentLabel}
          customerName={emailSale.customer?.name}
          defaultEmail={emailSale.customer?.email}
          customerId={emailSale.customer_id}
          saleId={emailSale.id}
          emailSentCount={emailTarget.emailSentCount}
          onSent={handleEmailSent}
        />
      )}
    </Card>
  );
}
