import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../api/products/ProductQueries';
import type { Category, CreateCategoryData } from '../../api/products/ProductTypes';
import { Button } from '../../../../shared/components/buttons/Button';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Input } from '../../../../shared/components/inputs/Input';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { FolderTree, Plus, Pencil, Trash } from 'lucide-react';

const emptyForm: CreateCategoryData = { name: '', description: '', sort_order: 0 };

export default function CategoryList() {
  const { data: categories, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const { confirm } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryData>(emptyForm);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description, sort_order: cat.sort_order });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data: formData },
        { onSuccess: closeModal },
      );
    } else {
      createMutation.mutate(formData, { onSuccess: closeModal });
    }
  };

  const handleDelete = async (cat: Category) => {
    const confirmed = await confirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${cat.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(cat.id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<FolderTree className="w-12 h-12" />}
        title="Failed to load categories"
        description={error?.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Manage product categories</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      <Table<Category>
        columns={[
          { key: 'name', header: 'Name' },
          {
            key: 'description',
            header: 'Description',
            render: (item) => item.description || <span className="text-gray-400">—</span>,
          },
          { key: 'sort_order', header: 'Sort Order' },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) => (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(item); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ),
          },
        ]}
        data={categories || []}
      />

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value || null }))}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Input
            label="Sort Order"
            type="number"
            min={0}
            value={formData.sort_order ?? 0}
            onChange={(e) => setFormData((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
