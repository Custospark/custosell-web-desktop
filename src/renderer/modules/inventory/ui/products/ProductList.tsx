import { useState, useMemo, useCallback } from 'react';
import { useProducts, useDeleteProduct, inventoryKeys } from '../../api/products/ProductQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import type { ProductWithSyncMeta } from '../../../../app/store/offline/inventory/localProductsStore';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { Button } from '../../../../shared/components/buttons/Button';
import { SearchInput } from '../../../../shared/components/inputs/SearchInput';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { cn } from '../../../../shared/utils/cn';
import { matchesProductSearch } from '../../../../shared/utils/productSearch';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { ProductStatsCards } from './ProductStatsCards';
import { isServiceItem, tracksStock } from '../../api/products/ProductTypes';
import { Package, Plus, Pencil, Trash, PackagePlus, Upload, Download, Eye, Trash2, CheckSquare, Square, Store } from 'lucide-react';
import { avatarUrl } from '../../../../shared/utils/avatarUrl';
import ProductFormModal from './ProductFormModal';
import StockAdjustDrawer from './StockAdjustDrawer';
import ImportModal from './ImportModal';
import ExportModal from './ExportModal';
import LedgerHistoryModal from './LedgerHistoryModal';

export default function ProductList() {
  const queryClient = useQueryClient();
  const { data: products, isLoading, error, isFetching } = useProducts();
  const deleteMutation = useDeleteProduct();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [storefrontFilter, setStorefrontFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSyncMeta | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithSyncMeta | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<ProductWithSyncMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await axiosInstance.post('/products/bulk-delete', { ids });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      setSelectedIds(new Set());
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const safe = products.filter(Boolean) as ProductWithSyncMeta[];
    return safe.filter((p) => {
      if (storefrontFilter === 'listed' && !p.listed_for_storefront) return false;
      if (storefrontFilter === 'unlisted' && p.listed_for_storefront) return false;
      if (!search.trim()) return true;
      return matchesProductSearch(p, search);
    });
  }, [products, search, storefrontFilter]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingProduct(null); setFormOpen(true); };
  const openEdit = (p: ProductWithSyncMeta) => { setEditingProduct(p); setFormOpen(true); };

  const handleDelete = async (product: ProductWithSyncMeta) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(product.id);
  };

  const filteredIds = filtered.map((p) => p.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredIds));
  }, [allSelected, filteredIds]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Delete products?',
      message: `This will permanently delete ${selectedIds.size} product(s). This action cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (ok) bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  if (!products?.length && (isLoading || isFetching)) return <LoadingSkeleton variant="table" />;

  if (error && !products?.length) {
    return (
      <EmptyState icon={<Package className="w-12 h-12" />} title="Failed to load products"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product inventory{isOffline && ' · Offline mode'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} disabled={isOffline} title={isOffline ? 'Unavailable offline' : ''}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">Download</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} disabled={isOffline} title={isOffline ? 'Unavailable offline' : ''}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">Upload</span>
          </Button>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">Add Product</span>
          </Button>
        </div>
      </div>

      <ProductStatsCards products={products || []} />
      <div className="h-6" />

      <Card>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <SearchInput placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <select
            value={storefrontFilter}
            onChange={(e) => setStorefrontFilter(e.target.value as 'all' | 'listed' | 'unlisted')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter by public shop listing"
          >
            <option value="all">All shops</option>
            <option value="listed">Listed on public shop</option>
            <option value="unlisted">Not listed</option>
          </select>
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} title="Select all" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              Select All
            </button>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending || isOffline}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title={isOffline ? 'Unavailable offline' : ''}>
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
        <Table<ProductWithSyncMeta>
          rowKey={(p) => p.id}
          columns={[
            { key: 'select', header: '', render: (item) => (
              <button onClick={() => toggleOne(item.id)} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                {selectedIds.has(item.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              </button>
            )},
            { key: 'name', header: 'Name', render: (item) => (
              <div className="flex items-center gap-2.5 min-w-0">
                {item.image_path ? (
                  <img
                    src={avatarUrl(item.image_path)}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 ring-1 ring-gray-200">
                    <Package className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900">{item.name}</span>
                    {item.listed_for_storefront ? (
                      <span title="Listed on public shop" className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Store className="h-2.5 w-2.5" />
                        Shop
                      </span>
                    ) : null}
                  </div>
                  {item._syncFailed ? (
                    <span
                      className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                      title={item._lastError || 'Sync failed'}
                    >
                      Sync failed
                    </span>
                  ) : item._pendingSync && <Badge variant="warning">Pending sync</Badge>}
                </div>
              </div>
            ) },
            { key: 'barcode', header: 'Barcode', render: (item) => item.barcode || <span className="text-gray-400">—</span> },
            { key: 'category', header: 'Category', render: (item) => item.category?.name || <span className="text-gray-400">—</span> },
            { key: 'unit', header: 'Unit', render: (item) => item.unit || <span className="text-gray-400">—</span> },
            { key: 'unit_price', header: 'Unit Price', render: (item) => formatCurrency(item.unit_price) },
            { key: 'wholesale_price', header: 'Wholesale', render: (item) => item.wholesale_price ? formatCurrency(item.wholesale_price) : <span className="text-gray-400">—</span> },
            { key: 'stock_quantity', header: 'Stock Qty', render: (item) => {
                if (isServiceItem(item)) {
                  return <span className="text-xs font-medium text-blue-600">Service</span>;
                }
                const isLow = item.stock_quantity <= item.low_stock_threshold;
                return <span className={cn(isLow && 'text-amber-600 font-semibold')}>{item.stock_quantity}{isLow && <span className="ml-1 text-xs text-amber-500">(low)</span>}</span>;
              },
            },
            { key: 'is_active', header: 'Status', render: (item) => item.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge> },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setHistoryProduct(item); }} title="View History"><Eye className="w-4 h-4 text-gray-500" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  {!item._pendingSync && tracksStock(item) && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAdjustingProduct(item); }} title="Adjust Stock"><PackagePlus className="w-4 h-4 text-blue-600" /></Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete" disabled={item._pendingSync}><Trash className="w-4 h-4 text-red-500" /></Button>
                </div>
              ),
            },
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

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editingProduct}
        onProductUpdated={(updated) => {
          setEditingProduct((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        }}
      />

      {adjustingProduct && (
        <StockAdjustDrawer
          open={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          product={adjustingProduct}
        />
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        }}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {historyProduct && (
        <LedgerHistoryModal
          open={!!historyProduct}
          onClose={() => setHistoryProduct(null)}
          productId={historyProduct.id}
          productName={historyProduct.name}
        />
      )}
    </>
  );
}
