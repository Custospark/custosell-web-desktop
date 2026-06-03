import { useState, useMemo, useRef, useEffect } from 'react';
import {
  useStockMovements, useCreateStockMovement, useProducts,
} from '../../api/products/ProductQueries';
import type { StockMovement } from '../../api/products/ProductTypes';
import type { Product } from '../../api/products/ProductTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { ClipboardList, Plus, Package, Search, Archive, Hash, FileText, Minus, Plus as PlusIcon, AlertTriangle } from 'lucide-react';

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
  const { data: movements, isLoading, error } = useStockMovements();
  const { data: products } = useProducts();
  const createMutation = useCreateStockMovement();

  const [filterProductId, setFilterProductId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stock Ledger</h2>
            <p className="text-sm text-gray-500 mt-1">Inventory movements and audit trail</p>
          </div>
          <Button onClick={() => setDrawerOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Record Adjustment</Button>
        </div>

        <div className="flex items-center gap-4 mb-4">
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
        </div>

        <Table<StockMovement>
          rowKey={(m) => m.id}
          columns={[
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
        <Pagination
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          totalItems={paginated.totalItems}
          pageSize={paginated.pageSize}
          onPageChange={paginated.setPage}
          onPageSizeChange={paginated.setPageSize}
        />
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
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'add' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
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
