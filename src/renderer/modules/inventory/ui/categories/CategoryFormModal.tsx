import { useState, useEffect, useMemo } from 'react';
import { useCreateCategory, useUpdateCategory } from '../../api/products/ProductQueries';
import type { Category, CreateCategoryData } from '../../api/products/ProductTypes';
import { Modal } from '../../../../shared/components/modals/Modal';
import { Button } from '../../../../shared/components/buttons/Button';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from '../../../pipeline/ui/pipelineFormFields';
import { FolderTree, FileText, Hash, Check } from 'lucide-react';

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  /** Called with the created category so callers (e.g. the product modal) can auto-select it. */
  onCreated?: (category: Category) => void;
}

const emptyForm: CreateCategoryData = { name: '', description: '', sort_order: 0 };

export default function CategoryFormModal({ open, onClose, category, onCreated }: CategoryFormModalProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!category;

  const [form, setForm] = useState<CreateCategoryData>(emptyForm);

  useEffect(() => {
    queueMicrotask(() => {
      if (category) {
        setForm({ name: category.name, description: category.description, sort_order: category.sort_order });
      } else {
        setForm(emptyForm);
      }
    });
  }, [category, open]);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (category) {
      updateMutation.mutate({ id: category.id, data: form }, { onSuccess: onClose });
    } else {
      createMutation.mutate(form, {
        onSuccess: (created) => {
          onCreated?.(created);
          onClose();
        },
      });
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isEditing ? 'Edit Category' : 'Add Category'}
      subtitle={isEditing ? 'Update category details' : 'Create a new product category'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PipelineModalHero
          icon={FolderTree}
          tone="blue"
          title={isEditing ? 'Update category' : 'New category'}
          description={isEditing ? 'Update category details' : 'Create a new product category'}
        />

        <PipelineFormSection title="Category details" icon={FolderTree}>
          <PipelineIconField label="Name" icon={FolderTree} required>
            <input
              className={pipelineInputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Beverages"
              required
              autoFocus
            />
          </PipelineIconField>
          <PipelineIconField label="Description" icon={FileText}>
            <textarea
              className={`${pipelineInputClass} min-h-[80px]`}
              value={form.description ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))}
              placeholder="Optional description"
            />
          </PipelineIconField>
          <PipelineIconField label="Sort Order" icon={Hash}>
            <input
              className={pipelineInputClass}
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            <Check className="h-4 w-4" />
            {isEditing ? 'Save category' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
