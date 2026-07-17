import { useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import {
  usePipelineBoardMetaFields,
  usePipelineLeadMetaValues,
  useSyncPipelineLeadMetaValues,
  useCreatePipelineBoardMetaField,
  useUpdatePipelineBoardMetaField,
  useDeletePipelineBoardMetaField,
} from '../api/usePipelineQueries';
import type { PipelineBoardMetaField, MetaFieldType } from '../api/pipelineTypes';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { PipelineFormSection, pipelineInputClass, pipelineSelectClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { Database, Plus, Pencil, Check, Trash2 } from 'lucide-react';

interface CardMetaFieldsSectionProps {
  leadId: number;
  boardId: number;
  canEdit?: boolean;
}

const FIELD_TYPES: { value: MetaFieldType; label: string; desc: string }[] = [
  { value: 'text', label: 'Text', desc: 'Short text content' },
  { value: 'number', label: 'Number', desc: 'Numeric values' },
  { value: 'date', label: 'Date', desc: 'Date picker' },
  { value: 'select', label: 'Select', desc: 'Single choice from options' },
  { value: 'multi_select', label: 'Multi-select', desc: 'Multiple choices from options' },
];

function FieldForm({ name, type, options, required, onNameChange, onTypeChange, onOptionsChange, onRequiredChange }: {
  name: string; type: MetaFieldType; options: string; required: boolean;
  onNameChange: (v: string) => void; onTypeChange: (v: MetaFieldType) => void;
  onOptionsChange: (v: string) => void; onRequiredChange: (v: boolean) => void;
}) {
  const showOptions = type === 'select' || type === 'multi_select';
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Field name</label>
        <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Department, Size, Priority Score" className={cn(pipelineInputClass, 'h-9 px-3 text-sm')} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Type</label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {FIELD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onTypeChange(t.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-all',
                type === t.value
                  ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <p className="text-xs font-semibold text-gray-800">{t.label}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
      {showOptions && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Options</label>
          <input value={options} onChange={(e) => onOptionsChange(e.target.value)} placeholder="Option A, Option B, Option C" className={cn(pipelineInputClass, 'h-9 px-3 text-sm')} />
          <p className="mt-1 text-[10px] text-gray-400">Separate each option with a comma.</p>
        </div>
      )}
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={required} onChange={(e) => onRequiredChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        Required — users must provide a value for this field
      </label>
    </div>
  );
}

export default function CardMetaFieldsSection({ leadId, boardId, canEdit = true }: CardMetaFieldsSectionProps) {
  const { data: fields = [] } = usePipelineBoardMetaFields(boardId);
  const { data: values = [] } = usePipelineLeadMetaValues(leadId);
  const syncValues = useSyncPipelineLeadMetaValues(leadId);
  const createField = useCreatePipelineBoardMetaField(boardId);
  const updateField = useUpdatePipelineBoardMetaField(boardId);
  const deleteField = useDeletePipelineBoardMetaField(boardId);
  const { confirm } = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<MetaFieldType>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<MetaFieldType>('text');
  const [editOptions, setEditOptions] = useState('');
  const [editRequired, setEditRequired] = useState(false);

  const valueMap = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const v of values) map.set(v.meta_field_id, v.value);
    return map;
  }, [values]);

  const setValue = (metaFieldId: number, value: string | null) => {
    if (!canEdit) return;
    const next = fields
      .filter((f) => f.id !== metaFieldId || value != null)
      .map((f) => ({ meta_field_id: f.id, value: f.id === metaFieldId ? value : (valueMap.get(f.id) ?? null) }));
    if (value != null) {
      const exists = next.find((n) => n.meta_field_id === metaFieldId);
      if (!exists) next.push({ meta_field_id: metaFieldId, value });
    }
    syncValues.mutate(next);
  };

  const resetCreate = () => { setNewName(''); setNewType('text'); setNewOptions(''); setNewRequired(false); setShowCreate(false); };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createField.mutate({
      name: newName.trim(), type: newType,
      options: (newType === 'select' || newType === 'multi_select') ? newOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      required: newRequired,
    });
    resetCreate();
  };

  const startEdit = (field: PipelineBoardMetaField) => {
    setEditingId(field.id); setEditName(field.name); setEditType(field.type);
    setEditOptions((field.options ?? []).join(', ')); setEditRequired(field.required);
  };

  const saveEdit = () => {
    if (editingId === null || !editName.trim()) return;
    updateField.mutate({
      id: editingId, name: editName.trim(), type: editType,
      options: (editType === 'select' || editType === 'multi_select') ? editOptions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      required: editRequired,
    });
    setEditingId(null);
  };

  const handleDelete = async (field: PipelineBoardMetaField) => {
    const ok = await confirm({
      title: 'Delete custom field?',
      message: `"${field.name}" and all its values on cards will be permanently removed.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    deleteField.mutate(field.id);
  };

  return (
    <PipelineFormSection title="Custom fields" icon={Database}>
      {fields.length > 0 && (
        <div className="mb-4 space-y-3">
          {[...fields].sort((a, b) => a.sort_order - b.sort_order).map((field) => {
            if (editingId === field.id) {
              return (
                <div key={field.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <FieldForm name={editName} type={editType} options={editOptions} required={editRequired}
                    onNameChange={setEditName} onTypeChange={setEditType} onOptionsChange={setEditOptions} onRequiredChange={setEditRequired} />
                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button type="button" size="sm" onClick={saveEdit} disabled={!editName.trim()} className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
              );
            }

            const currentValue = valueMap.get(field.id) ?? '';
            return (
              <div key={field.id} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                    {field.name}
                    {field.required && <span className="text-red-500">*</span>}
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-500">{field.type}</span>
                  </label>
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => startEdit(field)} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Edit field"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void handleDelete(field)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete field"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                {field.type === 'text' && <input type="text" value={currentValue} onChange={(e) => setValue(field.id, e.target.value || null)} disabled={!canEdit} className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')} placeholder={`Enter ${field.name.toLowerCase()}…`} />}
                {field.type === 'number' && <input type="number" value={currentValue} onChange={(e) => setValue(field.id, e.target.value || null)} disabled={!canEdit} className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')} placeholder="0" />}
                {field.type === 'date' && <input type="date" value={currentValue} onChange={(e) => setValue(field.id, e.target.value || null)} disabled={!canEdit} className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')} />}
                {field.type === 'select' && (
                  <select value={currentValue} onChange={(e) => setValue(field.id, e.target.value || null)} disabled={!canEdit} className={cn(pipelineSelectClass, 'h-8 px-2.5 text-sm')}>
                    <option value="">{field.required ? 'Select…' : 'None'}</option>
                    {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {field.type === 'multi_select' && (
                  <div className="flex flex-wrap gap-1.5">
                    {(field.options ?? []).map((opt) => {
                      const selected = (currentValue ?? '').split(',').map((s) => s.trim()).includes(opt);
                      return (
                        <button key={opt} type="button" disabled={!canEdit} onClick={() => {
                          const current = (currentValue ?? '').split(',').map((s) => s.trim()).filter(Boolean);
                          const next = selected ? current.filter((s) => s !== opt) : [...current, opt];
                          setValue(field.id, next.length > 0 ? next.join(', ') : null);
                        }} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold transition-all', selected ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50')}>{opt}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (showCreate ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-indigo-900">New custom field</p>
          <FieldForm name={newName} type={newType} options={newOptions} required={newRequired}
            onNameChange={setNewName} onTypeChange={setNewType} onOptionsChange={setNewOptions} onRequiredChange={setNewRequired} />
          <div className="flex justify-end gap-2 border-t border-indigo-100 pt-3">
            <Button type="button" size="sm" variant="secondary" onClick={resetCreate}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={!newName.trim()} loading={createField.isPending} className="inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Add field
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          {fields.length > 0 ? 'Add custom field' : 'Create your first custom field'}
        </Button>
      ))}
    </PipelineFormSection>
  );
}
