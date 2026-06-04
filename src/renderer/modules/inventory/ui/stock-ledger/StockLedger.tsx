import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  useStockMovements, useCreateStockMovement, useProducts,
} from '../../api/products/ProductQueries';
import type { StockMovement } from '../../api/products/ProductTypes';
import type { Product } from '../../api/products/ProductTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { Button } from '../../../../shared/components/buttons/Button';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { ClipboardList, Plus, Package, Search, Archive, Hash, FileText, Minus, Plus as PlusIcon, AlertTriangle, Trash2, CheckSquare, Square, RotateCcw } from 'lucide-react';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sale', label: 'Sale' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
  { value: 'initial', label: 'Initial' },
];

const movementTypeOptions = [
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
  const createMutation = useCreateStockMovement();

  const [filterProductId, setFilterProductId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // Form state
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [movementType, setMovementType] = useState('adjustment');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, searchQuery]);

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => {
      if (filterProductId && m.product_id !== Number(filterProductId)) return false;
      if (filterType && m.type !== filterType) return false;
      return true;
    });
  }, [movements, filterProductId, filterType]);

  const paginated = usePagination(filtered, 15);

  useEffect(() => {
    if (drawerOpen) {
      setDirection('add');
      setSelectedProduct(null);
      setSearchQuery('');
      setQuantity(1);
      setMovementType('adjustment');
      setReference('');
      setNotes('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [drawerOpen]);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSearchQuery(p.name);
  };

  const handleSubmit = () => {
    if (!selectedProduct) return;
    const change = direction === 'add' ? quantity : -quantity;
    createMutation.mutate(
      {
        product_id: selectedProduct.id,
        type: movementType as 'purchase' | 'sale' | 'adjustment' | 'return' | 'initial',
        quantity_change: change,
        stock_before: selectedProduct.stock_quantity,
        stock_after: Math.max(0, selectedProduct.stock_quantity + change),
        reference: reference || null,
        notes: notes || null,
      },
      { onSuccess: () => setDrawerOpen(false) },
    );
  };

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

  const afterAdjust = selectedProduct
    ? direction === 'add'
      ? selectedProduct.stock_quantity + quantity
      : Math.max(0, selectedProduct.stock_quantity - quantity)
    : 0;

  const wouldGoNegative = direction === 'remove' && selectedProduct && quantity > selectedProduct.stock_quantity;
  const canSubmit = !!selectedProduct && quantity > 0 && !wouldGoNegative && (direction === 'add' || (direction === 'remove' && selectedProduct.stock_quantity >= quantity));

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) {
    return (
      <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="Failed to load stock movements"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <Card className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stock Ledger</h2>
            <p className="text-sm text-gray-500 mt-1">Inventory movements and audit trail</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} title="Refresh" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
              <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Button onClick={() => setDrawerOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Record Adjustment</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4 flex-wrap shrink-0">
          <div className="w-64">
            <select className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)}>
              <option value="">All Products</option>
              {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <select className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
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

      <SlideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Record Stock Adjustment"
        subtitle="Record a manual stock movement"
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        canSubmit={canSubmit}
      >
        {/* Product Search */}
        <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Product</h3>
          </div>
          <div className="p-4">
            {!selectedProduct ? (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select a product</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input ref={searchRef}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mt-1">
                  {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                    <button key={p.id} type="button"
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-blue-50 text-left transition-colors"
                      onClick={() => selectProduct(p)}>
                      <Package className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-gray-400 text-xs ml-auto">Stock: {p.stock_quantity}</span>
                    </button>
                  )) : (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">No products found</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {selectedProduct.name} — Stock: <strong>{selectedProduct.stock_quantity}</strong>
                <button type="button" onClick={() => { setSelectedProduct(null); setSearchQuery(''); }}
                  className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium">Change</button>
              </div>
            )}
          </div>
        </div>

        {/* Direction */}
        <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Adjustment</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button type="button"
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'add' ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setDirection('add')}>
                <PlusIcon className="w-4 h-4 inline mr-1.5" />Increase Stock
              </button>
              <button type="button"
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setDirection('remove')}>
                <Minus className="w-4 h-4 inline mr-1.5" />Decrease Stock
              </button>
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white mb-4"
                value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                {movementTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Quantity to {direction === 'add' ? 'add' : 'remove'}</label>
              <div className="relative">
                <Archive className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" type="number" min={1}
                  value={quantity || ''} onChange={(e) => setQuantity(e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value) || 1))}
                  onFocus={(e) => e.target.select()} />
              </div>
            </div>

            {selectedProduct && (
              <>
                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Current stock:</span>
                    <span className="font-medium">{selectedProduct.stock_quantity}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-medium">
                    <span>After adjustment:</span>
                    <span className={afterAdjust === 0 ? 'text-red-600' : ''}>{afterAdjust}</span>
                  </div>
                </div>
                {wouldGoNegative && (
                  <div className="flex items-start gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Stock cannot go below zero. Reduce quantity or switch to Increase.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reference & Notes */}
        <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className={labelClass}>Reference (optional)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-001" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2 text-gray-400 w-4 h-4" />
                <textarea className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                  value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          </div>
        </div>
      </SlideDrawer>
    </>
  );
}
