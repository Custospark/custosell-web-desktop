import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import {
  usePipelineBoardMetaFields,
  usePipelineBoards,
  useCreatePipelineBoardMetaField,
  useUpdatePipelineBoardMetaField,
  useDeletePipelineBoardMetaField,
} from '../api/usePipelineQueries';
import type { PipelineBoardMetaField, MetaFieldType } from '../api/pipelineTypes';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { pipelineInputClass } from './pipelineFormFields';
import { cn } from '../../../shared/utils/cn';
import { Plus, X, Pencil, Check, Trash2, GripVertical } from 'lucide-react';

const FIELD_TYPES: { value: MetaFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi select' },
];

interface BoardMetaFieldsSettingsProps {
  boardId?: number;
}

export default function BoardMetaFieldsSettings({ boardId: fixedBoardId }: BoardMetaFieldsSettingsProps) {
  const { data: boards = [] } = usePipelineBoards({ salesOnly: true });
  const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('');
  const resolvedBoardId = fixedBoardId ?? (selectedBoardId === '' ? boards[0]?.id : selectedBoardId) ?? 0;
  const { data: fields = [] } = usePipelineBoardMetaFields(resolvedBoardId);
  const createField = useCreatePipelineBoardMetaField(resolvedBoardId ?? 0);
  const updateField = useUpdatePipelineBoardMetaField(resolvedBoardId ?? 0);
  const deleteField = useDeletePipelineBoardMetaField(resolvedBoardId ?? 0);
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

  const handleCreate = () => {
    if (!newName.trim()) return;
    createField.mutate({
      name: newName.trim(),
      type: newType,
      options: (newType === 'select' || newType === 'multi_select')
        ? newOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      required: newRequired,
    });
    setNewName('');
    setNewType('text');
    setNewOptions('');
    setNewRequired(false);
    setShowCreate(false);
  };

  const startEdit = (field: PipelineBoardMetaField) => {
    setEditingId(field.id);
    setEditName(field.name);
    setEditType(field.type);
    setEditOptions((field.options ?? []).join(', '));
    setEditRequired(field.required);
  };

  const saveEdit = () => {
    if (editingId === null || !editName.trim()) return;
    updateField.mutate({
      id: editingId,
      name: editName.trim(),
      type: editType,
      options: (editType === 'select' || editType === 'multi_select')
        ? editOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      required: editRequired,
    });
    setEditingId(null);
  };

  const handleDelete = async (field: PipelineBoardMetaField) => {
    const ok = await confirm({
      title: 'Delete meta field?',
      message: `"${field.name}" and all its values on cards will be permanently removed.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    deleteField.mutate(field.id);
  };

  const needsBoardPicker = !fixedBoardId;

  return (
    <div className="space-y-4">
      {needsBoardPicker && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Board</label>
          <select
            value={resolvedBoardId ?? ''}
            onChange={(e) => setSelectedBoardId(e.target.value ? Number(e.target.value) : '')}
            className={pipelineInputClass}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
      {fields.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {fields.sort((a, b) => a.sort_order - b.sort_order).map((field) => (
            <li key={field.id} className="px-3 py-2.5">
              {editingId === field.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={cn(pipelineInputClass, 'h-8 flex-1 px-2.5 text-sm')} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') setEditingId(null); }} />
                    <select value={editType} onChange={(e) => setEditType(e.target.value as MetaFieldType)} className={cn(pipelineInputClass, 'h-8 w-28 px-2 text-xs')}>
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {(editType === 'select' || editType === 'multi_select') && (
                    <input value={editOptions} onChange={(e) => setEditOptions(e.target.value)} placeholder="Option A, Option B, Option C" className={cn(pipelineInputClass, 'h-8 px-2.5 text-xs')} />
                  )}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input type="checkbox" checked={editRequired} onChange={(e) => setEditRequired(e.target.checked)} className="rounded" />
                      Required
                    </label>
                    <div className="ml-auto flex gap-1">
                      <button type="button" onClick={saveEdit} disabled={!editName.trim()} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                    <span className="truncate text-sm font-medium text-gray-900">{field.name}</span>
                    <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">{field.type}</span>
                    {field.required && <span className="shrink-0 text-[10px] font-semibold text-red-500">Required</span>}
                    {field.options && field.options.length > 0 && (
                      <span className="hidden truncate text-xs text-gray-500 sm:inline">· {field.options.join(', ')}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button type="button" onClick={() => startEdit(field)} className="rounded p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => void handleDelete(field)} className="rounded p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showCreate ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-3">
          <p className="text-xs font-medium text-gray-700">Create custom field</p>
          <div className="flex items-center gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Field name" className={cn(pipelineInputClass, 'h-8 flex-1 px-2.5 text-sm')} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } if (e.key === 'Escape') setShowCreate(false); }} />
            <select value={newType} onChange={(e) => setNewType(e.target.value as MetaFieldType)} className={cn(pipelineInputClass, 'h-8 w-28 px-2 text-xs')}>
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {(newType === 'select' || newType === 'multi_select') && (
            <input value={newOptions} onChange={(e) => setNewOptions(e.target.value)} placeholder="Option A, Option B, Option C (comma separated)" className={cn(pipelineInputClass, 'h-8 px-2.5 text-xs')} />
          )}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="rounded" />
              Required
            </label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => { setShowCreate(false); setNewName(''); }}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleCreate} disabled={!newName.trim()} loading={createField.isPending} className="inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add meta field
        </Button>
      )}
    </div>
  );
}
