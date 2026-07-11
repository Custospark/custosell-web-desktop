import { useMemo, useState } from 'react';
import { RefreshCw, Truck } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Table } from '../../shared/components/tables/Table';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import type { PurchaseOrder, PurchaseOrderStatus } from './api/purchaseOrders/purchaseOrderTypes';
import {
  useAcceptPurchaseOrder,
  useDeletePurchaseOrder,
  useFulfillPurchaseOrder,
  useIncomingPurchaseOrders,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { purchaseOrderStatusBadge } from './ui/supply/purchaseOrderBadges';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';
import { SupplyStatusTabs } from './ui/supply/SupplyStatusTabs';
import { PurchaseOrderMobileCard } from './ui/supply/PurchaseOrderMobileCard';
import { sellerPoActions } from './ui/supply/sellerPoActions';
import ViewPurchaseOrderModal from './ui/supply/ViewPurchaseOrderModal';
import RejectPurchaseOrderModal from './ui/supply/RejectPurchaseOrderModal';
import ViewInvoiceModal from '../invoices/ViewInvoiceModal';

const STATUS_TABS: { id: PurchaseOrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'received', label: 'Received' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

function poInvoiceId(po: PurchaseOrder): number | null {
  const id = po.invoice_id ?? po.invoice?.id;
  return id != null && id > 0 ? id : null;
}

export default function IncomingOrdersPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [statusTab, setStatusTab] = useState<PurchaseOrderStatus | 'all'>('submitted');
  const [search, setSearch] = useState('');
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [rejectPo, setRejectPo] = useState<PurchaseOrder | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<{
    id: number;
    focus: 'details' | 'receipts';
  } | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useIncomingPurchaseOrders(undefined, !isOffline);
  const acceptPo = useAcceptPurchaseOrder();
  const fulfillPo = useFulfillPurchaseOrder();
  const deletePo = useDeletePurchaseOrder();

  const orders = useMemo(() => {
    let list = data ?? [];
    if (statusTab !== 'all') list = list.filter((po) => po.status === statusTab);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q)
        || (po.buyer_business?.name ?? '').toLowerCase().includes(q)
        || (po.notes ?? '').toLowerCase().includes(q),
    );
  }, [data, search, statusTab]);

  const statusCounts = useMemo(() => {
    const all = data ?? [];
    const counts: Record<string, number> = { all: all.length };
    for (const tab of STATUS_TABS) {
      if (tab.id === 'all') continue;
      counts[tab.id] = all.filter((po) => po.status === tab.id).length;
    }
    return counts;
  }, [data]);

  const paginated = usePagination(orders, 15);
  const busy = acceptPo.isPending || fulfillPo.isPending || deletePo.isPending;

  async function handleDelete(po: PurchaseOrder) {
    const ok = await confirm({
      title: 'Delete order?',
      message: `Permanently delete ${po.po_number}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      variant: 'danger',
    });
    if (ok) void deletePo.mutateAsync({ id: po.id, poNumber: po.po_number });
  }

  function rowActions(po: PurchaseOrder) {
    return sellerPoActions({
      po,
      isOffline,
      busy,
      onView: () => setViewPo(po),
      onAccept: () => void acceptPo.mutateAsync(po.id),
      onReject: () => setRejectPo(po),
      onFulfill: () => void fulfillPo.mutateAsync(po.id),
      onDelete: () => void handleDelete(po),
      onOpenInvoice: () => {
        const id = poInvoiceId(po);
        if (id) setInvoiceModal({ id, focus: 'details' });
      },
      onOpenReceipts: () => {
        const id = poInvoiceId(po);
        if (id) setInvoiceModal({ id, focus: 'receipts' });
      },
    });
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Incoming orders</h1>
          <p className="text-sm text-gray-600">
            Accepting an order creates the buyer invoice automatically. Record payments under Sales invoices.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="inline-flex items-center gap-2"
          disabled={isOffline || isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isOffline ? <SupplyOfflineBanner /> : null}

      <SupplyStatusTabs
        tabs={STATUS_TABS}
        active={statusTab}
        counts={statusCounts}
        onChange={setStatusTab}
      />

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search by PO number or buyer…"
        disabled={isOffline}
      />

      {isOffline ? (
        <EmptyState title="Offline" description="Connect to manage incoming orders." icon={<Truck className="h-10 w-10" />} />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : isError ? (
        <EmptyState
          title="Could not load incoming orders"
          description={error instanceof Error ? error.message : 'Something went wrong. Try refreshing.'}
          icon={<Truck className="h-10 w-10" />}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No incoming orders"
          description="When buyers submit purchase orders against your listed products, they appear here."
          icon={<Truck className="h-10 w-10" />}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {paginated.data.map((po) => (
              <PurchaseOrderMobileCard
                key={po.id}
                purchaseOrder={po}
                partyLabel="Buyer"
                partyName={po.buyer_business?.name ?? `Business #${po.buyer_business_id}`}
                onOpen={() => setViewPo(po)}
                actions={rowActions(po)}
              />
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block" padding={false}>
            <Table
              data={paginated.data}
              rowKey={(po) => po.id}
              onRowClick={(po) => setViewPo(po)}
              columns={[
                {
                  key: 'po_number',
                  header: 'PO',
                  render: (po) => <span className="font-medium text-gray-900">{po.po_number}</span>,
                },
                {
                  key: 'buyer',
                  header: 'Buyer',
                  render: (po) => po.buyer_business?.name ?? `Business #${po.buyer_business_id}`,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (po) => purchaseOrderStatusBadge(po.status),
                },
                {
                  key: 'invoice',
                  header: 'Invoice',
                  render: (po) =>
                    po.invoice?.invoice_number ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const id = poInvoiceId(po);
                          if (id) setInvoiceModal({ id, focus: 'details' });
                        }}
                      >
                        {po.invoice.invoice_number}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    ),
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: (po) => formatCurrency(Number(po.total_amount)),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (po) => (
                    <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {rowActions(po)}
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-4">
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

      {viewPo ? (
        <ViewPurchaseOrderModal
          purchaseOrder={viewPo}
          isOpen={!!viewPo}
          onClose={() => setViewPo(null)}
          role="seller"
        />
      ) : null}

      {rejectPo ? (
        <RejectPurchaseOrderModal
          purchaseOrder={rejectPo}
          isOpen={!!rejectPo}
          onClose={() => setRejectPo(null)}
        />
      ) : null}

      {invoiceModal ? (
        <ViewInvoiceModal
          key={`${invoiceModal.id}-${invoiceModal.focus}`}
          invoiceId={invoiceModal.id}
          isOpen
          onClose={() => setInvoiceModal(null)}
          role="seller"
          focus={invoiceModal.focus}
        />
      ) : null}
    </div>
  );
}
