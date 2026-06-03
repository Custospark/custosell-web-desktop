import { useState, useMemo } from 'react';
import { useSales } from '../../api/salesQueries';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { SearchInput } from '../../../../shared/components/inputs/SearchInput';
import { Receipt } from 'lucide-react';

const methodBadge: Record<string, 'success' | 'primary' | 'warning' | 'neutral'> = {
  cash: 'success', mobile_money: 'primary', card: 'warning', other: 'neutral',
};

export default function SalesHistory() {
  const { data: sales, isLoading, error } = useSales();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!sales) return [];
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) => s.receipt_number.toLowerCase().includes(q));
  }, [sales, search]);

  const paginated = usePagination(filtered, 15);

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) return <EmptyState icon={<Receipt className="w-12 h-12" />} title="Failed to load sales" description="An error occurred" actionLabel="Retry" onAction={() => window.location.reload()} />;

  const totalRevenue = filtered.reduce((s, sale) => s + parseFloat(sale.total_amount), 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales History</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} sale(s) · Total: {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="mb-4 max-w-xs">
        <SearchInput placeholder="Search receipt #..." value={search} onChange={(e: any) => setSearch(e.target.value)} onClear={() => setSearch('')} />
      </div>

      <Table<any>
        rowKey={(s) => s.id}
        columns={[
          { key: 'receipt_number', header: 'Receipt' },
          { key: 'sale_date', header: 'Date', render: (s) => new Date(s.sale_date).toLocaleDateString() },
          { key: 'payment_method', header: 'Payment', render: (s) => <Badge variant={methodBadge[s.payment_method] || 'neutral'}>{s.payment_method.replace('_', ' ')}</Badge> },
          { key: 'total_amount', header: 'Total', render: (s) => formatCurrency(s.total_amount) },
          { key: 'payment_status', header: 'Status', render: (s) => s.payment_status === 'refunded' ? <Badge variant="danger">Refunded</Badge> : s.payment_status === 'partially_refunded' ? <Badge variant="warning">Partial</Badge> : <Badge variant="success">Paid</Badge> },
        ]}
        data={paginated.data}
      />
      <Pagination currentPage={paginated.page} totalPages={paginated.totalPages} totalItems={paginated.totalItems} pageSize={paginated.pageSize} onPageChange={paginated.setPage} onPageSizeChange={paginated.setPageSize} />
    </Card>
  );
}
