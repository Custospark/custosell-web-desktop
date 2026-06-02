import { useState, useMemo } from 'react';
import { useProducts, useDeleteProduct } from '../../api/products/ProductQueries';
import type { Product } from '../../api/products/ProductTypes';
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
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { Package, Plus, Pencil, Trash, Archive } from 'lucide-react';
import ProductFormDrawer from './ProductFormDrawer';
import StockAdjustDrawer from './StockAdjustDrawer';

export default function ProductList() {
  const { data: products, isLoading, error } = useProducts();
  const deleteMutation = useDeleteProduct();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingProduct(null); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setDrawerOpen(true); };

  const handleDelete = async (product: Product) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(product.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<Package className="w-12 h-12" />} title="Failed to load products"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your product inventory</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Product</Button>
        </div>
        <div className="mb-4">
          <SearchInput placeholder="Search products by name..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
        <Table<Product>
          rowKey={(p) => p.id}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'category', header: 'Category', render: (item) => item.category?.name || <span className="text-gray-400">—</span> },
            { key: 'unit_price', header: 'Unit Price', render: (item) => formatCurrency(item.unit_price) },
            {
              key: 'stock_quantity', header: 'Stock Qty',
              render: (item) => {
                const isLow = item.stock_quantity <= item.low_stock_threshold;
                return <span className={cn(isLow && 'text-amber-600 font-semibold')}>{item.stock_quantity}{isLow && <span className="ml-1 text-xs text-amber-500">(low)</span>}</span>;
              },
            },
            { key: 'is_active', header: 'Status', render: (item) => item.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge> },
            {
              key: 'actions', header: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAdjustingProduct(item); }} title="Adjust Stock"><Archive className="w-4 h-4 text-amber-600" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete"><Trash className="w-4 h-4 text-red-500" /></Button>
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
        />
      </Card>

      <ProductFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={editingProduct}
      />

      {adjustingProduct && (
        <StockAdjustDrawer
          open={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          product={adjustingProduct}
        />
      )}
    </>
  );
}
