import { useState, useMemo, useCallback } from 'react';
import { useSales } from '../../api/salesQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { SearchInput } from '../../../../shared/components/inputs/SearchInput';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { Eye, RotateCcw, Trash2, CheckSquare, Square, WifiOff } from 'lucide-react';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import { grossSaleAmount, netSaleAmount, refundedAmount } from '../../utils/saleAmounts';
import type { Sale } from '../../api/salesTypes';
import type { SaleWithSyncMeta } from '../../../../app/store/offline/sales/localSalesStore';

export default function SalesHistory() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { data: sales = [], isLoading, error, refetch, isFetching } = useSales();
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);
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
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter((s) => s.receipt_number.toLowerCase().includes(q));
  }, [sales, search]);

  const paginated = usePagination(filtered, 15);

  const allSelected = paginated.data.length > 0 && paginated.data.every((s) => selectedIds.has(s.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.data.map((s) => s.id)));
    }
  }, [allSelected, paginated.data]);

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
      <div className="flex items-center justify-between mb-4">
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

      <div className="flex items-center gap-4 mb-4">
        <div className="max-w-xs flex-1">
          <SearchInput placeholder="Search receipt #..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} title="Select all" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
            Select All
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium">
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
          { key: 'payment_status', header: 'Status', render: (s) => s.payment_status === 'refunded' ? <Badge variant="danger">Full Refund</Badge> : s.payment_status === 'partially_refunded' ? <Badge variant="warning">Partially Refunded</Badge> : <Badge variant="success">Paid</Badge> },
          { key: 'actions', header: 'Receipt', render: (s) => (
            <div className="flex gap-1">
              <button title="Preview receipt" onClick={() => setPreviewSale(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          )},
        ]}
        data={paginated.data}
      />
      <div className="flex items-center justify-between mt-4">
        <Pagination currentPage={paginated.page} totalPages={paginated.totalPages} totalItems={paginated.totalItems} pageSize={paginated.pageSize} onPageChange={paginated.setPage} onPageSizeChange={paginated.setPageSize} />
      </div>
      {previewSale && (
        <ReceiptPreviewModal sale={previewSale} open={!!previewSale} onClose={() => setPreviewSale(null)} />
      )}
    </Card>
  );
}
