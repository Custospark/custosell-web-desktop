import { useState } from 'react';
import { useCategories, useDeleteCategory } from '../../api/products/ProductQueries';
import type { Category } from '../../api/products/ProductTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { FolderTree, Plus, Pencil, Trash } from 'lucide-react';
import CategoryFormDrawer from './CategoryFormDrawer';

export default function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteMutation = useDeleteCategory();
  const { confirm } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const openCreate = () => { setEditingCategory(null); setDrawerOpen(true); };
  const openEdit = (cat: Category) => { setEditingCategory(cat); setDrawerOpen(true); };

  const handleDelete = async (cat: Category) => {
    const confirmed = await confirm({
      title: 'Delete Category', variant: 'danger',
      message: `Are you sure you want to delete "${cat.name}"? This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (confirmed) deleteMutation.mutate(cat.id);
  };

  const paginated = usePagination(categories || [], 5);

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) {
    return (
      <EmptyState icon={<FolderTree className="w-12 h-12" />} title="Failed to load categories"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <p className="text-sm text-gray-500 mt-1">Manage product categories</p>
          </div>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Category</Button>
        </div>
        <Table<Category>
          rowKey={(c) => c.id}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'description', header: 'Description', render: (item) => item.description || <span className="text-gray-400">—</span> },
            { key: 'sort_order', header: 'Sort Order' },
            {
              key: 'actions', header: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}><Trash className="w-4 h-4 text-red-500" /></Button>
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

      <CategoryFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        category={editingCategory}
      />
    </>
  );
}
