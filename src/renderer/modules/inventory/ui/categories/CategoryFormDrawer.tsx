import { useState, useEffect, useMemo } from 'react';
import { useCreateCategory, useUpdateCategory } from '../../api/products/ProductQueries';
import type { Category, CreateCategoryData } from '../../api/products/ProductTypes';
import { SlideDrawer } from '../../../../shared/components/modals/SlideDrawer';
import { FolderTree, FileText, Hash } from 'lucide-react';

interface CategoryFormDrawerProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}

const emptyForm: CreateCategoryData = { name: '', description: '', sort_order: 0 };

export default function CategoryFormDrawer({ open, onClose, category }: CategoryFormDrawerProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<CreateCategoryData>(emptyForm);

  useEffect(() => {
    if (category) {
      setForm({ name: category.name, description: category.description, sort_order: category.sort_order });
    } else {
      setForm(emptyForm);
    }
  }, [category, open]);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  const handleSubmit = () => {
    if (category) {
      updateMutation.mutate({ id: category.id, data: form }, { onSuccess: onClose });
    } else {
      createMutation.mutate(form, { onSuccess: onClose });
    }
  };

  const inputClass = "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Add Category'}
      subtitle={category ? 'Update category details' : 'Create a new product category'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Category Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={labelClass}>Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Beverages" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <textarea className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]" value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))} placeholder="Optional description" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Sort Order</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className={inputClass} type="number" min={0} value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
        </div>
      </div>
    </SlideDrawer>
  );
}
