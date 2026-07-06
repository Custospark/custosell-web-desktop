import { useRef, useState } from 'react';
import type { PipelineLead, PipelinePriority } from '../api/pipelineTypes';
import {
  useCreateChecklistItem,
  useCreatePipelineChecklist,
  useCreatePipelineLabel,
  useDeletePipelineAttachment,
  usePipelineLabels,
  useUpdateChecklistItem,
  useUpdatePipelineLead,
  useUploadPipelineAttachment,
} from '../api/usePipelineQueries';
import { PipelineFormSection, PipelineIconField, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import {
  Calendar, CheckSquare, Flag, Paperclip, Plus, Tag, Trash2, AlignLeft,
} from 'lucide-react';

const PRIORITIES: { value: PipelinePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

const LABEL_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

interface CardDetailExtrasProps {
  lead: PipelineLead;
  boardId: number;
}

export default function CardDetailExtras({ lead, boardId }: CardDetailExtrasProps) {
  const { data: boardLabels = [] } = usePipelineLabels(boardId);
  const updateLead = useUpdatePipelineLead();
  const patchLead = (payload: Record<string, unknown>) =>
    updateLead.mutate({ id: lead.id, board_id: boardId, silent: true, ...payload });
  const createLabel = useCreatePipelineLabel(boardId);
  const createChecklist = useCreatePipelineChecklist(lead.id, boardId);
  const createItem = useCreateChecklistItem(lead.id, boardId);
  const updateItem = useUpdateChecklistItem(lead.id, boardId);
  const uploadAttachment = useUploadPipelineAttachment(lead.id, boardId);
  const deleteAttachment = useDeletePipelineAttachment(lead.id, boardId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newItemText, setNewItemText] = useState<Record<number, string>>({});
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const selectedLabelIds = new Set((lead.labels ?? []).map((l) => l.id));
  const isLead = (lead.card_type ?? 'lead') === 'lead';

  const toggleLabel = (labelId: number) => {
    const next = new Set(selectedLabelIds);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    patchLead({ label_ids: [...next] });
  };

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!name) return;
    const label = await createLabel.mutateAsync({ name, color: newLabelColor });
    const next = new Set(selectedLabelIds);
    next.add(label.id);
    patchLead({ label_ids: [...next] });
    setNewLabelName('');
    setShowCreateLabel(false);
  };

  const handleAddChecklist = async () => {
    await createChecklist.mutateAsync('Checklist');
  };

  const handleAddItem = async (checklistId: number) => {
    const title = (newItemText[checklistId] ?? '').trim();
    if (!title) return;
    await createItem.mutateAsync({ checklistId, title });
    setNewItemText((prev) => ({ ...prev, [checklistId]: '' }));
  };

  return (
    <>
      <PipelineFormSection title="Description" icon={AlignLeft}>
        <textarea
          defaultValue={lead.description ?? ''}
          rows={3}
          placeholder="Add a more detailed description…"
          className={cn(pipelineInputClass, 'resize-none pl-3')}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (lead.description ?? null)) {
              patchLead({ description: v });
            }
          }}
        />
      </PipelineFormSection>

      <PipelineFormSection title="Dates & priority" icon={Calendar}>
        <div className="grid gap-4 sm:grid-cols-2">
          <PipelineIconField label="Start date" icon={Calendar}>
            <input
              type="date"
              defaultValue={lead.start_date?.slice(0, 10) ?? ''}
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value || null;
                if (v !== (lead.start_date?.slice(0, 10) ?? null)) {
                  patchLead({ start_date: v });
                }
              }}
            />
          </PipelineIconField>
          <PipelineIconField label="Due date" icon={Calendar}>
            <input
              type="date"
              defaultValue={(lead.due_date ?? lead.expected_close_date)?.slice(0, 10) ?? ''}
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value || null;
                const current = (lead.due_date ?? lead.expected_close_date)?.slice(0, 10) ?? null;
                if (v !== current) {
                  patchLead({ due_date: v, expected_close_date: isLead ? v : lead.expected_close_date });
                }
              }}
            />
          </PipelineIconField>
        </div>
        <PipelineIconField label="Priority" icon={Flag}>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => patchLead({
                  priority: lead.priority === p.value ? null : p.value,
                })}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-opacity',
                  lead.priority === p.value ? 'text-white ring-transparent' : 'bg-white text-gray-700 ring-gray-200',
                )}
                style={lead.priority === p.value ? { backgroundColor: p.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </PipelineIconField>
      </PipelineFormSection>

      <PipelineFormSection title="Labels" icon={Tag}>
        {boardLabels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {boardLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold text-white transition-opacity',
                  selectedLabelIds.has(label.id) ? 'opacity-100 ring-2 ring-offset-1 ring-gray-400' : 'opacity-50 hover:opacity-80',
                )}
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </button>
            ))}
          </div>
        )}
        {showCreateLabel ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-3">
            <input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Label name"
              className={cn(pipelineInputClass, 'pl-3 text-sm')}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateLabel();
                }
                if (e.key === 'Escape') setShowCreateLabel(false);
              }}
            />
            <div className="flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewLabelColor(color)}
                  className={cn(
                    'h-7 w-7 rounded-md ring-2 ring-offset-1 transition-transform hover:scale-105',
                    newLabelColor === color ? 'ring-gray-500' : 'ring-transparent',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCreateLabel}
                loading={createLabel.isPending}
                disabled={!newLabelName.trim()}
              >
                Create label
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowCreateLabel(false);
                  setNewLabelName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowCreateLabel(true)}
            className="inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Create label
          </Button>
        )}
      </PipelineFormSection>

      <PipelineFormSection title="Checklists" icon={CheckSquare}>
        <Button type="button" variant="secondary" size="sm" onClick={handleAddChecklist} className="mb-3 inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add checklist
        </Button>
        {(lead.checklists ?? []).map((checklist) => {
          const items = checklist.items ?? [];
          const done = items.filter((i) => i.is_done).length;
          return (
            <div key={checklist.id} className="mb-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-900">{checklist.title}</h4>
                {items.length > 0 && (
                  <span className="text-xs text-gray-500">{done}/{items.length}</span>
                )}
              </div>
              {items.length > 0 && (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
                  />
                </div>
              )}
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={(e) => updateItem.mutate({ id: item.id, is_done: e.target.checked })}
                      className="mt-1 rounded border-gray-300"
                    />
                    <span className={cn('text-sm', item.is_done && 'text-gray-400 line-through')}>{item.title}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  value={newItemText[checklist.id] ?? ''}
                  onChange={(e) => setNewItemText((p) => ({ ...p, [checklist.id]: e.target.value }))}
                  placeholder="Add an item…"
                  className={cn(pipelineInputClass, 'pl-3 text-sm')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(checklist.id); } }}
                />
                <Button type="button" size="sm" onClick={() => handleAddItem(checklist.id)}>Add</Button>
              </div>
            </div>
          );
        })}
      </PipelineFormSection>

      <PipelineFormSection title="Attachments" icon={Paperclip}>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xlsx,.txt,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAttachment.mutate(file);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          loading={uploadAttachment.isPending}
          className="mb-3 inline-flex items-center gap-1"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Upload file
        </Button>
        <ul className="space-y-2">
          {(lead.attachments ?? []).map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <a
                href={att.file_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-blue-600 hover:underline"
              >
                {att.file_name}
              </a>
              <button
                type="button"
                onClick={() => deleteAttachment.mutate(att.id)}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!(lead.attachments ?? []).length && (
            <li className="text-xs text-gray-500">No attachments yet.</li>
          )}
        </ul>
      </PipelineFormSection>
    </>
  );
}
