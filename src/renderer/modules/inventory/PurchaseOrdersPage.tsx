import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Truck } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
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
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
  usePurchaseOrders,
  useSubmitPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { purchaseOrderStatusBadge } from './ui/supply/purchaseOrderBadges';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';
import { SupplyStatusTabs } from './ui/supply/SupplyStatusTabs';
import { PurchaseOrderMobileCard } from './ui/supply/PurchaseOrderMobileCard';
import { buyerPoActions } from './ui/supply/buyerPoActions';
import { ReceivePurchaseOrderModal } from './ui/supply/ReceivePurchaseOrderModal';
import ViewPurchaseOrderModal from './ui/supply/ViewPurchaseOrderModal';
import EditPurchaseOrderModal from './ui/supply/EditPurchaseOrderModal';

const STATUS_TABS: { id: PurchaseOrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'received', label: 'Received' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

function invoicePath(po: PurchaseOrder, focus: 'invoice' | 'payments' = 'invoice'): string {
  const invoiceId = po.invoice_id ?? po.invoice?.id;
  const params = new URLSearchParams();
  if (invoiceId) params.set('invoice', String(invoiceId));
  if (po.id) params.set('po', String(po.id));
  if (focus === 'payments') params.set('focus', 'payments');
  const qs = params.toString();
  return qs ? `${ROUTES.INVOICES.INDEX}?${qs}` : ROUTES.INVOICES.INDEX;
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [statusTab, setStatusTab] = useState<PurchaseOrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [editPo, setEditPo] = useState<PurchaseOrder | null>(null);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = usePurchaseOrders(undefined, !isOffline);
  const submitPo = useSubmitPurchaseOrder();
  const cancelPo = useCancelPurchaseOrder();
  const deletePo = useDeletePurchaseOrder();

  const orders = useMemo(() => {
    let list = data ?? [];
    if (statusTab !== 'all') list = list.filter((po) => po.status === statusTab);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q)
        || (po.seller_business?.name ?? '').toLowerCase().includes(q)
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
  const busy = submitPo.isPending || cancelPo.isPending || deletePo.isPending;

  async function handleDelete(po: PurchaseOrder) {
    const ok = await confirm({
      title: 'Delete purchase order?',
      message: `Permanently delete ${po.po_number}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      variant: 'danger',
    });
    if (ok) void deletePo.mutateAsync({ id: po.id, poNumber: po.po_number });
  }

  function rowActions(po: PurchaseOrder) {
    return buyerPoActions({
      po,
      isOffline,
      busy,
      onView: () => setViewPo(po),
      onEdit: () => setEditPo(po),
      onSubmit: () => void submitPo.mutateAsync(po.id),
      onCancel: async () => {
        const ok = await confirm({
          title: 'Cancel purchase order?',
          message: `Cancel ${po.po_number}? This cannot be undone.`,
          confirmText: 'Cancel PO',
          cancelText: 'Keep',
          variant: 'danger',
        });
        if (ok) void cancelPo.mutateAsync(po.id);
      },
      onDelete: () => void handleDelete(po),
      onReceive: () => setReceivePo(po),
      onOpenInvoice: () => navigate(invoicePath(po, 'invoice')),
      onOpenReceipts: () => navigate(invoicePath(po, 'payments')),
    });
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Purchase orders</h1>
          <p className="text-sm text-gray-600">
            Orders you placed with suppliers. Invoices and payments live under Invoices.
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
        placeholder="Search by PO number or seller…"
        disabled={isOffline}
      />

      {isOffline ? (
        <EmptyState title="Offline" description="Connect to load purchase orders." icon={<Truck className="h-10 w-10" />} />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : isError ? (
        <EmptyState
          title="Could not load purchase orders"
          description={error instanceof Error ? error.message : 'Something went wrong. Try refreshing.'}
          icon={<Truck className="h-10 w-10" />}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No purchase orders"
          description="Create one from Marketplace by adding listed products to a PO cart."
          icon={<Truck className="h-10 w-10" />}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {paginated.data.map((po) => (
              <PurchaseOrderMobileCard
                key={po.id}
                purchaseOrder={po}
                partyLabel="Seller"
                partyName={po.seller_business?.name ?? `Business #${po.seller_business_id}`}
                onOpen={() => setViewPo(po)}
                actions={rowActions(po)}
              />
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block" padding={false}>
            <Table
              data={paginated.data}
              rowKey={(po) => po.id}
              columns={[
                {
                  key: 'po_number',
                  header: 'PO',
                  render: (po) => <span className="font-medium text-gray-900">{po.po_number}</span>,
                },
                {
                  key: 'seller',
                  header: 'Seller',
                  render: (po) => po.seller_business?.name ?? `Business #${po.seller_business_id}`,
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
                        onClick={() => navigate(invoicePath(po))}
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
                  key: 'date',
                  header: 'Date',
                  render: (po) => (
                    <span className="text-sm text-gray-500">
                      {new Date(po.created_at).toLocaleDateString()}
                    </span>
                  ),
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
        />
      ) : null}

      {editPo ? (
        <EditPurchaseOrderModal
          purchaseOrder={editPo}
          isOpen={!!editPo}
          onClose={() => setEditPo(null)}
        />
      ) : null}

      {receivePo ? (
        <ReceivePurchaseOrderModal
          key={receivePo.id}
          purchaseOrder={receivePo}
          isOpen={!!receivePo}
          onClose={() => setReceivePo(null)}
        />
      ) : null}
    </div>
  );
}
