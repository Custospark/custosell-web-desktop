import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ban,
  CircleCheck,
  Clock,
  FileText,
  LayoutList,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  WifiOff,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { resumeOrderToCart, loadOrderForUpdate } from './api/salesSlice';
import {
  orderItemsToCartItems,
  type OrderStatus,
  type PosOrder,
} from './api/orders/orderTypes';
import { useCancelOrder, useOrders, useUpdateOrder } from './api/orders/useOrderQueries';
import { useSale, useSales } from './api/salesQueries';
import { useInvoices } from '../invoices/api/InvoiceQueries';
import { findInvoiceBySaleId } from '../invoices/invoiceUtils';
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
import InvoiceFromSaleModal from './ui/InvoiceFromSaleModal';
import type { Invoice } from '../invoices/api/InvoiceTypes';

const STATUS_TABS: {
  id: OrderStatus | 'all';
  label: string;
  icon: typeof LayoutList;
}[] = [
  { id: 'all', label: 'All', icon: LayoutList },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CircleCheck },
  { id: 'invoiced', label: 'Invoiced', icon: FileText },
  { id: 'cancelled', label: 'Cancelled', icon: Ban },
];

function statusBadge(status: OrderStatus) {
  switch (status) {
    case 'open':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3" /> Open
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" className="gap-1">
          <CircleCheck className="w-3 h-3" /> Completed
        </Badge>
      );
    case 'invoiced':
      return (
        <Badge variant="primary" className="gap-1">
          <FileText className="w-3 h-3" /> Invoiced
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="danger" className="gap-1">
          <Ban className="w-3 h-3" /> Cancelled
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const cartItems = useAppSelector((s) => s.sales.cartItems);

  const [statusTab, setStatusTab] = useState<OrderStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [invoiceSaleId, setInvoiceSaleId] = useState<number | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  const filters = useMemo(
    () => ({
      status: statusTab === 'all' ? undefined : statusTab,
      q: search.trim() || undefined,
    }),
    [statusTab, search],
  );

  const { data: orders = [], isLoading, error, refetch, isFetching } = useOrders(filters);
  const { data: allOrders = [] } = useOrders();
  const statusCounts = useMemo(() => {
    const counts: Record<OrderStatus | 'all', number> = {
      all: allOrders.length,
      open: 0,
      completed: 0,
      invoiced: 0,
      cancelled: 0,
    };
    for (const order of allOrders) {
      if (order.status in counts) counts[order.status] += 1;
    }
    return counts;
  }, [allOrders]);
  const { data: invoices = [] } = useInvoices();
  const { data: sales = [] } = useSales();
  const { data: invoiceSale } = useSale(invoiceSaleId ?? 0);
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();

  const paginated = usePagination(orders, 15);

  const resume = async (order: PosOrder) => {
    if (order.status !== 'open') return;
    if (cartItems.length > 0) {
      const ok = await confirm({
        title: 'Replace current cart?',
        message: 'Resuming this order will replace the items currently in your cart.',
        confirmText: 'Resume order',
        cancelText: 'Keep cart',
        variant: 'warning',
      });
      if (!ok) return;
    }
    dispatch(resumeOrderToCart({
      orderId: order.id,
      items: orderItemsToCartItems(order.items),
      customerId: order.customer_id,
      notes: order.notes,
      discountAmount: Number(order.discount_amount ?? 0),
    }));
    navigate(ROUTES.SALES.NEW);
  };

  const startUpdate = async (order: PosOrder) => {
    if (order.status !== 'open') return;
    if (cartItems.length > 0) {
      const ok = await confirm({
        title: 'Replace current cart?',
        message: 'Updating this order will replace the items currently in your cart.',
        confirmText: 'Update order',
        cancelText: 'Keep cart',
        variant: 'warning',
      });
      if (!ok) return;
    }
    dispatch(loadOrderForUpdate({
      orderId: order.id,
      items: orderItemsToCartItems(order.items),
      customerId: order.customer_id,
      notes: order.notes,
      discountAmount: Number(order.discount_amount ?? 0),
    }));
    navigate(ROUTES.SALES.NEW);
  };

  const handleCancel = async (order: PosOrder) => {
    const ok = await confirm({
      title: 'Cancel order?',
      message: `${order.order_number} will be cancelled.`,
      confirmText: 'Cancel order',
      cancelText: 'Keep',
      variant: 'danger',
    });
    if (!ok) return;
    cancelOrder.mutate(order.id);
  };

  const handleRename = async (order: PosOrder) => {
    const next = window.prompt('Order / customer name', order.customer_name || 'Guest');
    if (next === null) return;
    updateOrder.mutate({
      id: order.id,
      customer_name: next.trim() || 'Guest',
    });
  };

  const openInvoiceForSale = (saleId: number) => {
    const inv = findInvoiceBySaleId(invoices, saleId) ?? null;
    setExistingInvoice(inv);
    setInvoiceSaleId(saleId);
  };

  const resolveSaleForInvoice = () => {
    if (!invoiceSaleId) return null;
    return sales.find((s) => s.id === invoiceSaleId) ?? invoiceSale ?? null;
  };

  const closeInvoiceModal = () => {
    setInvoiceSaleId(null);
    setExistingInvoice(null);
    void refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Held carts, completed sales, and invoiced orders</p>
        </div>
        <div className="flex items-center gap-2">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <WifiOff className="w-3.5 h-3.5" /> Offline — showing local orders
            </span>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Link
            to={ROUTES.SALES.NEW}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = statusCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  statusTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <sup
                  className={cn(
                    'ml-0.5 text-[10px] font-bold leading-none tabular-nums',
                    statusTab === tab.id ? 'text-blue-100' : 'text-gray-500',
                  )}
                >
                  {count}
                </sup>
              </button>
            );
          })}
          <div className="ml-auto w-full sm:w-64">
            <SearchInput
              placeholder="Search number or customer…"
              value={search}
              onChange={(e: { target: { value: string } }) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : error ? (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="Could not load orders"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-12 h-12" />}
            title={search ? 'No matching orders' : 'No orders yet'}
            description={
              statusTab === 'open'
                ? 'Hold a cart from New Sale to create an open order.'
                : 'Orders appear here as you hold, complete, and invoice sales.'
            }
            actionLabel="Go to New Sale"
            onAction={() => navigate(ROUTES.SALES.NEW)}
          />
        ) : (
          <>
            <Table<PosOrder>
              rowKey={(o) => o.id}
              data={paginated.data}
              columns={[
                {
                  key: 'order_number',
                  header: 'Order',
                  render: (order) => (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{order.order_number}</span>
                      {order.source === 'storefront' ? <Badge variant="primary">Online</Badge> : null}
                      {order._pendingSync ? <Badge variant="warning">Pending</Badge> : null}
                    </div>
                  ),
                },
                {
                  key: 'customer',
                  header: 'Customer',
                  render: (order) => (
                    <div>
                      <span className="text-sm text-gray-800">{order.customer_name || 'Guest'}</span>
                      {order.customer_phone ? (
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
                          <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                            {order.customer_phone}
                          </a>
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : null}
                      {order.notes ? (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{order.notes}</p>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: 'items',
                  header: 'Items',
                  render: (order) => {
                    const itemCount = order.item_count
                      ?? order.items?.reduce((s, i) => s + i.quantity, 0)
                      ?? 0;
                    return (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {itemCount}
                      </span>
                    );
                  },
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: (order) => (
                    <span className="font-semibold">{formatCurrency(Number(order.total_amount))}</span>
                  ),
                },
                {
                  key: 'time',
                  header: 'Time',
                  render: (order) => (
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(order.held_at ?? order.created_at).toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (order) => statusBadge(order.status),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (order) => {
                    const invoice = order.sale_id
                      ? findInvoiceBySaleId(invoices, order.sale_id)
                      : undefined;
                    return (
                      <div className="flex flex-wrap items-center gap-1">
                        {order.status === 'open' ? (
                          <>
                            <Button variant="ghost" size="sm" title="Resume to complete sale" onClick={() => void resume(order)}>
                              <Play className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Update order" onClick={() => void startUpdate(order)}>
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Rename" onClick={() => void handleRename(order)}>
                              Rename
                            </Button>
                            <Button variant="ghost" size="sm" title="Cancel order" onClick={() => void handleCancel(order)}>
                              <Ban className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        ) : null}
                        {(order.status === 'completed' || order.status === 'invoiced') && order.sale_id ? (
                          <>
                            <Link
                              to={ROUTES.SALES.HISTORY}
                              className="text-xs font-medium text-blue-600 hover:underline px-2 py-1"
                            >
                              View sale
                            </Link>
                            {invoice ? (
                              <Link
                                to={ROUTES.INVOICES.DETAIL(invoice.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline px-2 py-1"
                              >
                                <FileText className="w-3.5 h-3.5" /> Invoice
                              </Link>
                            ) : order.status === 'completed' ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline px-2 py-1"
                                onClick={() => openInvoiceForSale(order.sale_id!)}
                              >
                                <FileText className="w-3.5 h-3.5" /> Generate invoice
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
            />
            <div className="flex items-center justify-between mt-4">
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
      </Card>

      {invoiceSaleId && resolveSaleForInvoice() ? (
        <InvoiceFromSaleModal
          open
          linkedSale={resolveSaleForInvoice()!}
          existingInvoice={existingInvoice}
          onClose={closeInvoiceModal}
          onSuccess={closeInvoiceModal}
        />
      ) : null}
    </div>
  );
}
