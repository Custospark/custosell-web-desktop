import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ban,
  CircleCheck,
  Clock,
  FileText,
  LayoutList,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Badge } from '../../shared/components/badges/Badge';
import { Button } from '../../shared/components/buttons/Button';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Table } from '../../shared/components/tables/Table';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { marketplaceGlassPanel } from '../inventory/ui/marketplace/marketplaceTheme';
import { useMyStorefrontOrdersInfinite } from './api/storefrontQueries';
import type { MyStorefrontOrder } from './api/storefrontTypes';
import { useDiscoverShell } from './ui/discoverShellContext';

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

/** Orders you placed — progressive fetch + client-side status/search filter. */
export default function MyOrdersPage() {
  const navigate = useNavigate();
  const shell = useDiscoverShell();
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMyStorefrontOrdersInfinite();

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages.length]);

  const allOrders = useMemo(
    () => data?.pages.flatMap((p) => p.orders) ?? [],
    [data?.pages],
  );

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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allOrders.filter((o) => {
      if (statusTab !== 'all' && o.status !== statusTab) return false;
      if (!needle) return true;
      const hay = `${o.order_number} ${o.shop_name ?? ''} ${o.shop_slug ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [allOrders, statusTab, search]);

  const paginated = usePagination(filtered, 15);

  useEffect(() => {
    shell.setHeader({
      title: 'My Orders',
      subtitle: 'Orders you placed — each shop fulfills its own',
      actions: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          {isFetchingNextPage ? 'Loading more…' : isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      ),
    });
    return () => {
      shell.setHeader(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching, isFetchingNextPage]);

  return (
    <div className="space-y-4">
      <div className={cn(marketplaceGlassPanel, 'p-4')}>
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
                  'inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition-all hover:-translate-y-0.5',
                  statusTab === tab.id
                    ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-300/40 shadow-md'
                    : 'border-blue-300/90 bg-gradient-to-r from-blue-50 via-white to-sky-50 text-blue-900 hover:border-blue-400',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <sup
                  className={cn(
                    'ml-0.5 text-[10px] font-bold leading-none tabular-nums',
                    statusTab === tab.id ? 'text-blue-700' : 'text-slate-500',
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
          <LoadingSkeleton
            variant="page"
            message="Loading your orders…"
            detail="Fetching orders you placed across shops."
          />
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-600">Could not load your orders.</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title={allOrders.length === 0 ? 'No orders yet' : 'No matching orders'}
            description={
              allOrders.length === 0
                ? 'Browse Discover, open a shop, and place an order request.'
                : 'Try another status or search — filtering is instant on this device.'
            }
            actionLabel="Browse shops"
            onAction={() => navigate(`${ROUTES.DISCOVER}?focus=shops`)}
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
      </div>
    </div>
  );
}
