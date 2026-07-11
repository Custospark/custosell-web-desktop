import { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  FileText,
  PackageCheck,
  RefreshCw,
  Truck,
} from 'lucide-react';
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
  useAcceptPurchaseOrder,
  useFulfillPurchaseOrder,
  useIncomingPurchaseOrders,
  useRejectPurchaseOrder,
} from './api/purchaseOrders/usePurchaseOrderQueries';
import { purchaseOrderStatusBadge } from './ui/supply/purchaseOrderBadges';
import { SupplyOfflineBanner } from './ui/supply/SupplyOfflineBanner';
import GenerateSellerInvoiceFromPoModal from './ui/supply/GenerateSellerInvoiceFromPoModal';

const STATUS_TABS: { id: PurchaseOrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'received', label: 'Received' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function IncomingOrdersPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [statusTab, setStatusTab] = useState<PurchaseOrderStatus | 'all'>('submitted');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [invoicePo, setInvoicePo] = useState<PurchaseOrder | null>(null);

  const { data, isLoading, isFetching, refetch } = useIncomingPurchaseOrders(undefined, !isOffline);
  const acceptPo = useAcceptPurchaseOrder();
  const rejectPo = useRejectPurchaseOrder();
  const fulfillPo = useFulfillPurchaseOrder();

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
  const busy = acceptPo.isPending || rejectPo.isPending || fulfillPo.isPending;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Incoming orders</h1>
          <p className="text-sm text-gray-600">Purchase orders other businesses sent to you as the seller.</p>
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

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusTab(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm',
              statusTab === tab.id
                ? 'border-blue-300 bg-blue-50 text-blue-800'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
            )}
          >
            {tab.label}
            <Badge variant="neutral">{statusCounts[tab.id] ?? 0}</Badge>
          </button>
        ))}
      </div>

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
      ) : orders.length === 0 ? (
        <EmptyState
          title="No incoming orders"
          description="When buyers submit purchase orders against your listed products, they appear here."
          icon={<Truck className="h-10 w-10" />}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table
            data={paginated.data}
            rowKey={(po) => po.id}
            onRowClick={(po) => {
              setSelected(po);
              setRejectReason('');
            }}
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
                key: 'total',
                header: 'Total',
                render: (po) => formatCurrency(Number(po.total_amount)),
              },
              {
                key: 'actions',
                header: '',
                render: (po) => (
                  <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {po.status === 'submitted' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOffline || busy}
                        onClick={() => void acceptPo.mutateAsync(po.id)}
                        className="inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                      </Button>
                    ) : null}
                    {po.status === 'accepted' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isOffline || busy}
                        onClick={() => void fulfillPo.mutateAsync(po.id)}
                        className="inline-flex items-center gap-1"
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Fulfill
                      </Button>
                    ) : null}
                    {po.status === 'fulfilled' || po.status === 'received' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isOffline}
                        onClick={() => setInvoicePo(po)}
                        className="inline-flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" /> Invoice
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
          <div className="border-t border-gray-100 px-4 py-3">
            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </div>
        </Card>
      )}

      {selected ? (
        <Card className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{selected.po_number}</h2>
              <p className="text-sm text-gray-600">
                Buyer: {selected.buyer_business?.name ?? selected.buyer_business_id}
              </p>
            </div>
            {purchaseOrderStatusBadge(selected.status)}
          </div>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {(selected.items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{item.product_name}</span>
                <span className="shrink-0 text-gray-600">
                  {item.quantity} × {formatCurrency(Number(item.unit_price))}
                </span>
              </li>
            ))}
          </ul>
          {selected.status === 'submitted' ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="block text-xs font-medium text-gray-700" htmlFor="reject_reason">
                Rejection reason (required to reject)
              </label>
              <textarea
                id="reject_reason"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                value={rejectReason}
                disabled={isOffline || busy}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you cannot fulfill this order"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={isOffline || busy}
                  onClick={() => void acceptPo.mutateAsync(selected.id)}
                  className="inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" /> Accept
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isOffline || busy || !rejectReason.trim()}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Reject purchase order?',
                      message: `Reject ${selected.po_number}? The buyer will see your reason.`,
                      confirmText: 'Reject',
                      cancelText: 'Keep',
                      variant: 'danger',
                    });
                    if (!ok) return;
                    void rejectPo.mutateAsync({ id: selected.id, rejection_reason: rejectReason.trim() });
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <Ban className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          ) : null}
          {selected.status === 'accepted' ? (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={isOffline || busy}
                loading={fulfillPo.isPending}
                onClick={() => void fulfillPo.mutateAsync(selected.id)}
                className="inline-flex items-center gap-1"
              >
                <PackageCheck className="h-4 w-4" /> Fulfill & stock out
              </Button>
            </div>
          ) : null}
          {selected.status === 'fulfilled' || selected.status === 'received' ? (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={isOffline}
                onClick={() => setInvoicePo(selected)}
                className="inline-flex items-center gap-1"
              >
                <FileText className="h-4 w-4" /> Generate invoice
              </Button>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              Close detail
            </Button>
          </div>
        </Card>
      ) : null}

      {invoicePo ? (
        <GenerateSellerInvoiceFromPoModal
          purchaseOrder={invoicePo}
          isOpen={!!invoicePo}
          onClose={() => setInvoicePo(null)}
        />
      ) : null}
    </div>
  );
}
