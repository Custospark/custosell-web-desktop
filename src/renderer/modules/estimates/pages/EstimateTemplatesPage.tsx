import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useEstimateTemplates,
  useCreateEstimateTemplate,
  useUpdateEstimateTemplate,
  useDeleteEstimateTemplate,
} from '../api/useEstimateQueries';
import type { EstimateTemplate } from '../api/estimateTypes';
import { LayoutTemplate, Plus, Pencil, Trash2 } from 'lucide-react';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';

export default function EstimateTemplatesPage() {
  const { data: templates, isLoading } = useEstimateTemplates();
  const createTemplate = useCreateEstimateTemplate();
  const updateTemplate = useUpdateEstimateTemplate();
  const deleteTemplate = useDeleteEstimateTemplate();
  const { confirm } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EstimateTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setTerms('');
    setTaxRate(0);
    setModalOpen(true);
  };

  const openEdit = (template: EstimateTemplate) => {
    setEditing(template);
    setName(template.name);
    setDescription(template.description ?? '');
    setTerms(template.terms ?? '');
    setTaxRate(template.default_tax_rate);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description || null,
      terms: terms || null,
      default_tax_rate: taxRate,
      line_items_template: editing?.line_items_template ?? [{
        description: 'Scope item',
        quantity: 1,
        unit_cost: 0,
        unit_price: 0,
        markup_type: 'percent' as const,
        type: 'other' as const,
      }],
    };
    if (editing) {
      await updateTemplate.mutateAsync({ id: editing.id, payload });
    } else {
      await createTemplate.mutateAsync(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = async (template: EstimateTemplate) => {
    const ok = await confirm({
      title: 'Delete template?',
      message: `"${template.name}" will be removed permanently.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteTemplate.mutateAsync(template.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
          <p className="mt-1 text-sm text-gray-500">Reusable proposal structures for faster quoting.</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : (templates ?? []).length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <LayoutTemplate className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-600">No templates yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((template) => (
            <Card key={template.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                  )}
                </div>
                {!template.is_active && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inactive</span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {template.line_items_template.length} line item(s) · Tax {template.default_tax_rate}%
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(template)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(template)} className="text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit template' : 'New template'}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Default tax rate (%)" type="number" min="0" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Terms</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={createTemplate.isPending || updateTemplate.isPending}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
