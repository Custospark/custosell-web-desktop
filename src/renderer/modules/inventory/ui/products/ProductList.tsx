import { useState, useMemo, useCallback } from 'react';
import { useProducts, useDeleteProduct, inventoryKeys } from '../../api/products/ProductQueries';
import { useBulkUpdateListing } from '../../api/products/ProductListingQueries';
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
import { isServiceItem } from '../../api/products/ProductTypes';
import { Package, Plus, Upload, Download, Trash2, CheckSquare, Square, Store, ArrowLeftRight } from 'lucide-react';
import { avatarUrl } from '../../../../shared/utils/avatarUrl';
import ProductFormModal from './ProductFormModal';
import ProductRowActions from './ProductRowActions';
import StockAdjustModal from './StockAdjustModal';
import ImportModal from './ImportModal';
import ExportModal from './ExportModal';
import LedgerHistoryModal from './LedgerHistoryModal';
import BranchTransferModal from './BranchTransferModal';
import { useLocations } from '../../../settings/api/settings/LocationQueries';
import { useLocationStock } from '../../api/products/BranchStockQueries';

const BULK_LISTING_ACTIONS: { channel: 'supply' | 'storefront'; listed: boolean; label: string; title: string }[] = [
  { channel: 'storefront', listed: true, label: 'List shop', title: 'List selected on public shop' },
  { channel: 'storefront', listed: false, label: 'Unlist shop', title: 'Unlist selected from public shop' },
  { channel: 'supply', listed: true, label: 'List supply', title: 'List selected for supply' },
  { channel: 'supply', listed: false, label: 'Unlist supply', title: 'Unlist selected from supply' },
];

export default function ProductList() {
  const queryClient = useQueryClient();
  const { data: products, isLoading, error, isFetching } = useProducts();
  const deleteMutation = useDeleteProduct();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [storefrontFilter, setStorefrontFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [supplyFilter, setSupplyFilter] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSyncMeta | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithSyncMeta | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<ProductWithSyncMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { data: locations = [] } = useLocations();
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [transferOpen, setTransferOpen] = useState(false);
  const { data: branchStock = [] } = useLocationStock(branchFilter ? Number(branchFilter) : null);

  const stockByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of branchStock) map.set(item.product_id, item.stock_quantity);
    return map;
  }, [branchStock]);

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

  const bulkListingMutation = useBulkUpdateListing();

  const handleBulkListing = (channel: 'supply' | 'storefront', listed: boolean) => {
    if (selectedIds.size === 0) return;
    bulkListingMutation.mutate(
      { ids: Array.from(selectedIds), channel, listed },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    const safe = products.filter(Boolean) as ProductWithSyncMeta[];
    return safe.filter((p) => {
      if (branchFilter && !stockByProduct.has(p.id)) return false;
      if (storefrontFilter === 'listed' && !p.listed_for_storefront) return false;
      if (storefrontFilter === 'unlisted' && p.listed_for_storefront) return false;
      if (supplyFilter === 'listed' && !p.listed_for_supply) return false;
      if (supplyFilter === 'unlisted' && p.listed_for_supply) return false;
      if (!search.trim()) return true;
      return matchesProductSearch(p, search);
    });
  }, [products, search, storefrontFilter, supplyFilter, branchFilter, stockByProduct]);

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

      <Card>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <SearchInput placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setSelectedIds(new Set()); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter by branch"
          >
            <option value="">All branches</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (Default)' : ''}</option>
            ))}
          </select>
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
          <select
            value={supplyFilter}
            onChange={(e) => setSupplyFilter(e.target.value as 'all' | 'listed' | 'unlisted')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Filter by supply listing"
          >
            <option value="all">All supply</option>
            <option value="listed">Listed for supply</option>
            <option value="unlisted">Not listed for supply</option>
          </select>
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} title="Select all" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              Select All
            </button>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {BULK_LISTING_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => handleBulkListing(a.channel, a.listed)}
                    disabled={isOffline || bulkListingMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title={isOffline ? 'Unavailable offline' : a.title}
                  >
                    {a.channel === 'supply' ? <Package className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    <span className="hidden sm:inline">{a.label}</span>
                  </button>
                ))}
                <button onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending || isOffline}
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isOffline ? 'Unavailable offline' : `Delete ${selectedIds.size} selected product(s)`}>
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                </button>
                <button onClick={() => setTransferOpen(true)} disabled={isOffline}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isOffline ? 'Unavailable offline' : `Transfer ${selectedIds.size} selected product(s) to another branch`}>
                  <ArrowLeftRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Transfer</span>
                </button>
              </div>
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
                    {item.listed_for_supply ? (
                      <span title="Listed for supply" className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        <Package className="h-2.5 w-2.5" />
                        Supply
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
                const qty = branchFilter ? (stockByProduct.get(item.id) ?? 0) : item.stock_quantity;
                const isLow = qty <= item.low_stock_threshold;
                return <span className={cn(isLow && 'text-amber-600 font-semibold')}>{qty}{isLow && <span className="ml-1 text-xs text-amber-500">(low)</span>}</span>;
              },
            },
            { key: 'is_active', header: 'Status', render: (item) => item.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge> },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <ProductRowActions
                  product={item}
                  onViewHistory={() => setHistoryProduct(item)}
                  onEdit={() => openEdit(item)}
                  onAdjustStock={() => setAdjustingProduct(item)}
                  onDelete={() => handleDelete(item)}
                />
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
        <StockAdjustModal
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

      <BranchTransferModal
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setSelectedIds(new Set()); }}
        products={(products || []).filter((p) => selectedIds.has(p.id))}
      />
    </>
  );
}
