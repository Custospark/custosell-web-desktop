import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { Card } from '../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { Table } from '../../shared/components/tables/Table';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { useMyStorefrontOrders } from './api/storefrontQueries';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  delivered: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function MyOrdersPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isGuest = !user;
  const { data, isLoading, error } = useMyStorefrontOrders();

  const orders = useMemo(() => data ?? [], [data]);
  const paginated = usePagination(orders, 15);

  if (isGuest) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Sign in to track orders</h2>
        <p className="text-sm text-slate-500 mb-6">Log in to see orders you placed at public shops.</p>
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <LoadingSkeleton variant="minimal" message="Loading orders…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600">Could not load your orders.</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">No orders yet</h2>
        <p className="text-sm text-slate-500 mb-6">Browse shops and place your first order.</p>
        <Link
          to={ROUTES.DISCOVER}
          className="inline-flex px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          Browse shops
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <Card className="overflow-hidden p-0" padding={false}>
        <Table
          data={paginated.data}
          rowKey={(o) => o.id}
          columns={[
            {
              key: 'order_number',
              header: 'Order',
              render: (o) => <span className="font-mono text-sm font-semibold text-gray-900">{o.order_number}</span>,
            },
            {
              key: 'shop',
              header: 'Shop',
              render: (o) => (
                <Link to={ROUTES.SHOP(o.shop_slug)} className="text-sm text-blue-600 hover:underline font-medium">
                  {o.shop_name}
                </Link>
              ),
            },
            {
              key: 'items',
              header: 'Items',
              render: (o) => <span className="text-sm text-gray-600">{o.items_count} item{o.items_count === 1 ? '' : 's'}</span>,
            },
            {
              key: 'total',
              header: 'Total',
              render: (o) => (
                <span className="text-sm font-medium text-gray-900 tabular-nums">{formatCurrency(Number(o.total_amount))}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (o) => {
                const style = STATUS_STYLES[o.status] ?? 'bg-gray-50 text-gray-600';
                const label = STATUS_LABELS[o.status] ?? o.status;
                return (
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
                    {label}
                  </span>
                );
              },
            },
            {
              key: 'date',
              header: 'Date',
              render: (o) => (
                <span className="text-sm text-gray-500 tabular-nums">
                  {new Date(o.created_at).toLocaleDateString()}
                </span>
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
    </div>
  );
}
