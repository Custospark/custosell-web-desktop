import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { Input } from '../../../shared/components/inputs/Input';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import {
  useEstimateTemplates,
  useCreateEstimateTemplate,
  useUpdateEstimateTemplate,
  useDeleteEstimateTemplate,
} from '../api/useEstimateQueries';
import type { EstimateTemplate } from '../api/estimateTypes';
import { LayoutTemplate, Plus, Pencil, Trash2, FileSpreadsheet, Percent, ScrollText, Tag } from 'lucide-react';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { PipelineModalHero, PipelineFormSection } from '../ui/estimatesShared';

const cardStyles = {
  border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200',
};

export default function EstimateTemplatesPage() {
  const { data: templates, isLoading } = useEstimateTemplates();
  const createTemplate = useCreateEstimateTemplate();
  const updateTemplate = useUpdateEstimateTemplate();
  const deleteTemplate = useDeleteEstimateTemplate();
  const { confirm } = useConfirm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<EstimateTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [taxRate, setTaxRate] = useState(0);

  const isPending = createTemplate.isPending || updateTemplate.isPending;
  const canSave = name.trim().length > 0;

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setTerms('');
    setTaxRate(0);
    setDrawerOpen(true);
  };

  const openEdit = (template: EstimateTemplate) => {
    setEditing(template);
    setName(template.name);
    setDescription(template.description ?? '');
    setTerms(template.terms ?? '');
    setTaxRate(template.default_tax_rate);
    setDrawerOpen(true);
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
    setDrawerOpen(false);
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
        <LoadingSkeleton variant="card" />
      ) : (templates ?? []).length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <LayoutTemplate className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No templates yet</p>
          <p className="mt-1 text-xs text-gray-500">Create reusable proposal structures to speed up quoting.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New template
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((template) => (
            <div
              key={template.id}
              className={`group relative flex flex-col rounded-xl border-2 bg-gradient-to-br from-white to-white p-5 transition-all duration-300 hover:-translate-y-0.5 ${cardStyles.border} ${cardStyles.shadow}`}
            >
              <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 overflow-hidden rounded-full blur-2xl ${cardStyles.glow}`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className={`shrink-0 rounded-xl p-3 transition-all duration-300 ${cardStyles.iconBg} group-hover:scale-110 ${cardStyles.hoverBg}`}>
                  <FileSpreadsheet className={`h-5 w-5 ${cardStyles.iconColor}`} />
                </div>
                {!template.is_active && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                )}
              </div>
              <div className="relative mt-4 flex-1">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {template.line_items_template.length} item(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Tax {template.default_tax_rate}%
                  </span>
                </div>
              </div>
              <div className="relative mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <Button size="sm" variant="outline" onClick={() => openEdit(template)} className="inline-flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(template)} className="text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit template' : 'New template'}
        subtitle={editing ? `Editing ${editing.name}` : 'Create a reusable proposal template'}
        onSubmit={handleSave}
        isSubmitting={isPending}
        canSubmit={canSave}
        width="sm:w-[560px]"
      >
        <div className="space-y-5">
          <PipelineModalHero
            icon={LayoutTemplate}
            title={editing ? `Editing "${editing.name}"` : 'Create a proposal template'}
            description="Templates define default line items, tax rate, and terms. Use them to speed up the quoting process."
            tone="indigo"
          />

          <PipelineFormSection title="Template details" icon={Tag}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Standard consulting proposal" />
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of when to use this template" />
          </PipelineFormSection>

          <PipelineFormSection title="Defaults" icon={ScrollText}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Default tax rate (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={taxRate === 0 ? '' : String(taxRate)}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  setTaxRate(raw === '' ? 0 : parseFloat(raw) || 0);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Default terms & conditions</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                placeholder="Payment terms, delivery conditions, warranty info..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
            </div>
          </PipelineFormSection>
        </div>
      </SlideDrawer>
    </div>
  );
}