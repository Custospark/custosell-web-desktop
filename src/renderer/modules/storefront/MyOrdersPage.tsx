import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ban,
  CircleCheck,
  Clock,
  FileText,
  LayoutList,
  RefreshCw,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Table } from '../../shared/components/tables/Table';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { useMyStorefrontOrders } from './api/storefrontQueries';
import type { MyStorefrontOrder } from './api/storefrontTypes';

type StatusTab = 'all' | 'open' | 'completed' | 'invoiced' | 'cancelled';

const STATUS_TABS: { id: StatusTab; label: string; icon: typeof LayoutList }[] = [
  { id: 'all', label: 'All', icon: LayoutList },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CircleCheck },
  { id: 'invoiced', label: 'Invoiced', icon: FileText },
  { id: 'cancelled', label: 'Cancelled', icon: Ban },
];

function statusBadge(status: string) {
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

/** Buyer-facing storefront orders — same chrome pattern as Sales → Orders. */
export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');

  const filters = useMemo(
    () => ({
      status: statusTab === 'all' ? undefined : statusTab,
      q: search.trim() || undefined,
    }),
    [statusTab, search],
  );

  const { data: orders = [], isLoading, error, refetch, isFetching } = useMyStorefrontOrders(filters);
  const { data: allOrders = [] } = useMyStorefrontOrders();

  const statusCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = {
      all: allOrders.length,
      open: 0,
      completed: 0,
      invoiced: 0,
      cancelled: 0,
    };
    for (const order of allOrders) {
      const key = order.status as StatusTab;
      if (key !== 'all' && key in counts) counts[key] += 1;
    }
    return counts;
  }, [allOrders]);

  const paginated = usePagination(orders, 15);

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500">Orders you placed at public shops</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Link
            to={ROUTES.DISCOVER}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Store className="w-4 h-4" />
            Discover
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
              placeholder="Search number or shop…"
              value={search}
              onChange={(e: { target: { value: string } }) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600">Could not load your orders.</p>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No orders yet"
            description="Browse Discover, open a shop, and place an order request."
            actionLabel="Browse shops"
            onAction={() => navigate(ROUTES.DISCOVER)}
          />
        ) : (
          <>
            <Table
              data={paginated.data}
              rowKey={(o: MyStorefrontOrder) => o.id}
              columns={[
                {
                  key: 'order_number',
                  header: 'Order',
                  render: (o: MyStorefrontOrder) => (
                    <span className="font-mono text-sm font-semibold text-gray-900">{o.order_number}</span>
                  ),
                },
                {
                  key: 'shop',
                  header: 'Shop',
                  render: (o: MyStorefrontOrder) =>
                    o.shop_slug ? (
                      <Link to={ROUTES.SHOP(o.shop_slug)} className="text-sm font-medium text-blue-600 hover:underline">
                        {o.shop_name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-700">{o.shop_name}</span>
                    ),
                },
                {
                  key: 'items',
                  header: 'Items',
                  render: (o: MyStorefrontOrder) => (
                    <span className="text-sm text-gray-600">
                      {o.items_count} item{o.items_count === 1 ? '' : 's'}
                    </span>
                  ),
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: (o: MyStorefrontOrder) => (
                    <span className="text-sm font-medium tabular-nums text-gray-900">
                      {formatCurrency(Number(o.total_amount), o.currency || 'UGX')}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (o: MyStorefrontOrder) => statusBadge(o.status),
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (o: MyStorefrontOrder) => (
                    <span className="text-sm tabular-nums text-gray-500">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                    </span>
                  ),
                },
              ]}
            />
            <div className="border-t border-gray-100 px-1 py-3">
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
    </div>
  );
}
