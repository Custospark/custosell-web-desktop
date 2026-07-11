import { useMemo, useState } from 'react';
import { Ban, Eye, FileText, PackageCheck, Pencil, RefreshCw, Send, Truck } from 'lucide-react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { Badge } from '../../shared/components/badges/Badge';
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
  usePurchaseOrders,
  useSubmitPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { purchaseOrderStatusBadge } from './ui/supply/purchaseOrderBadges';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';
import { SupplyStatusTabs } from './ui/supply/SupplyStatusTabs';
import { PurchaseOrderMobileCard } from './ui/supply/PurchaseOrderMobileCard';
import { ReceivePurchaseOrderModal } from './ui/supply/ReceivePurchaseOrderModal';
import GenerateInvoiceFromPoModal from './ui/supply/GenerateInvoiceFromPoModal';
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

function buyerPoActions(opts: {
  po: PurchaseOrder;
  isOffline: boolean;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReceive: () => void;
  onInvoice: () => void;
}) {
  const { po, isOffline, busy, onView, onEdit, onSubmit, onCancel, onReceive, onInvoice } = opts;
  return (
    <>
      <button
        type="button"
        onClick={onView}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
        title="View order details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {po.status === 'draft' ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
          title="Edit this draft order"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {po.status === 'draft' ? (
        <Button
          type="button"
          size="sm"
          disabled={isOffline || busy}
          onClick={onSubmit}
          title="Submit this order to the seller"
          className="inline-flex items-center gap-1"
        >
          <Send className="h-3.5 w-3.5" /> Submit
        </Button>
      ) : null}
      {po.status === 'draft' || po.status === 'submitted' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isOffline || busy}
          onClick={onCancel}
          title="Cancel this order"
          className="inline-flex items-center gap-1"
        >
          <Ban className="h-3.5 w-3.5" /> Cancel
        </Button>
      ) : null}
      {po.status === 'fulfilled' ? (
        <Button
          type="button"
          size="sm"
          disabled={isOffline}
          onClick={onReceive}
          title="Receive these items into your stock"
          className="inline-flex items-center gap-1"
        >
          <PackageCheck className="h-3.5 w-3.5" /> Receive
        </Button>
      ) : null}
      {po.status === 'received' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isOffline}
          onClick={onInvoice}
          title="Generate an invoice from this order"
          className="inline-flex items-center gap-1"
        >
          <FileText className="h-3.5 w-3.5" /> Invoice
        </Button>
      ) : null}
    </>
  );
}

export default function PurchaseOrdersPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [statusTab, setStatusTab] = useState<PurchaseOrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);
  const [editPo, setEditPo] = useState<PurchaseOrder | null>(null);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [generateInvoicePo, setGenerateInvoicePo] = useState<PurchaseOrder | null>(null);

  const { data, isLoading, isFetching, refetch } = usePurchaseOrders(undefined, !isOffline);
  const submitPo = useSubmitPurchaseOrder();
  const cancelPo = useCancelPurchaseOrder();

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
  const busy = submitPo.isPending || cancelPo.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Purchase orders</h1>
          <p className="text-sm text-gray-600">Outbound B2B orders you placed with other businesses.</p>
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
                actions={buyerPoActions({
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
                  onReceive: () => setReceivePo(po),
                  onInvoice: () => setGenerateInvoicePo(po),
                })}
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
                      {buyerPoActions({
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
                        onReceive: () => setReceivePo(po),
                        onInvoice: () => setGenerateInvoicePo(po),
                      })}
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
          purchaseOrder={receivePo}
          isOpen={!!receivePo}
          onClose={() => setReceivePo(null)}
        />
      ) : null}

      {generateInvoicePo ? (
        <GenerateInvoiceFromPoModal
          purchaseOrder={generateInvoicePo}
          isOpen={!!generateInvoicePo}
          onClose={() => setGenerateInvoicePo(null)}
        />
      ) : null}
    </div>
  );
}
