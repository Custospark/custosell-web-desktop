import { useState, useMemo, useCallback } from 'react';
import { useStockMovements, useProducts } from '../../api/products/ProductQueries';
import type { StockMovement } from '../../api/products/ProductTypes';
import { stockMovementActor } from '../../api/products/ProductTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { SearchableSelect } from '../../../../shared/components/inputs/SearchableSelect';
import { UserIdentityChip } from '../../../../shared/components/UserIdentityChip';
import { ClipboardList, Trash2, CheckSquare, Square, RotateCcw } from 'lucide-react';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sale', label: 'Sale' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
  { value: 'initial', label: 'Initial' },
];

const typeBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'primary' | 'neutral'> = {
  purchase: 'success', sale: 'danger', adjustment: 'warning', return: 'primary', initial: 'neutral',
};

export default function StockLedger() {
  const { data: movements, isLoading, error, refetch } = useStockMovements();
  const { data: products } = useProducts();

  const [filterProductId, setFilterProductId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const qc = useQueryClient();
  const { confirm } = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await axiosInstance.post('/stock-movements/bulk-delete', { ids });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'stock-movements'] });
      setSelectedIds(new Set());
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 400);
  };

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => {
      if (filterProductId && m.product_id !== Number(filterProductId)) return false;
      if (filterType && m.type !== filterType) return false;
      return true;
    });
  }, [movements, filterProductId, filterType]);

  const paginated = usePagination(filtered, 15);

  const filteredIds = filtered.map((m) => m.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  }, [allSelected, filteredIds]);

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
      title: 'Delete stock movements?',
      message: `This will permanently delete ${selectedIds.size} stock movement record(s). This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(Array.from(selectedIds));
    }
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) {
    return (
      <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="Failed to load stock movements"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Stock Ledger</h2>
          <p className="text-sm text-gray-500 mt-1">Inventory movements and audit trail</p>
        </div>
        <button onClick={handleRefresh} title="Refresh" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
          <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 flex-wrap shrink-0">
        <div className="w-full sm:w-64">
          <SearchableSelect
            placeholder="All Products"
            searchPlaceholder="Search products..."
            value={filterProductId}
            onChange={setFilterProductId}
            options={(products ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
            emptyOption={{ value: '', label: 'All Products' }}
          />
        </div>
        <div className="w-full sm:w-48">
          <select className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-auto">
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <Table<StockMovement>
            rowKey={(m) => m.id}
            columns={[
              { key: 'select', header: '', render: (item) => (
                <button onClick={() => toggleOne(item.id)} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                  {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </button>
              )},
              { key: 'created_at', header: 'Date', render: (item) => new Date(item.created_at).toLocaleString() },
              { key: 'product', header: 'Product', render: (item) => item.product?.name || <span className="text-gray-400">—</span> },
              { key: 'type', header: 'Type', render: (item) => <Badge variant={typeBadgeVariant[item.type] || 'neutral'}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Badge> },
              { key: 'quantity_change', header: 'Change', render: (item) => <span className={item.quantity_change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{item.quantity_change > 0 ? '+' : ''}{item.quantity_change}</span> },
              { key: 'stock_before', header: 'Before' },
              { key: 'stock_after', header: 'After' },
              { key: 'reference', header: 'Reference', render: (item) => item.reference || <span className="text-gray-400">—</span> },
              { key: 'notes', header: 'Notes', render: (item) => item.notes || <span className="text-gray-400">—</span> },
              {
                key: 'created_by',
                header: 'By',
                render: (item) => {
                  const actor = stockMovementActor(item);
                  return actor ? (
                    <UserIdentityChip name={actor.name} avatar={actor.avatar} size="xs" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  );
                },
              },
            ]}
            data={paginated.data}
          />
        </div>
      </div>

      <div className="shrink-0 mt-4">
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
  );
}
