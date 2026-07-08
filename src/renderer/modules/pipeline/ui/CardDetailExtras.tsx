import { useRef, useState } from 'react';
import type { PipelineLead, PipelinePriority } from '../api/pipelineTypes';
import {
  useCreateChecklistItem,
  useCreatePipelineChecklist,
  useCreatePipelineLabel,
  useDeleteChecklistItem,
  useDeletePipelineAttachment,
  useDeletePipelineChecklist,
  usePipelineLabels,
  useUpdateChecklistItem,
  useUpdatePipelineChecklist,
  useUpdatePipelineLead,
  useUploadPipelineAttachment,
} from '../api/usePipelineQueries';
import { PipelineFormSection, PipelineIconField, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import PipelineColorPicker from './PipelineColorPicker';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';
import {
  Calendar, CheckSquare, Flag, Paperclip, Plus, Tag, Trash2, AlignLeft,
} from 'lucide-react';

const PRIORITIES: { value: PipelinePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

const checklistTextareaClass = cn(
  pipelineInputClass,
  'resize-none pl-3 text-sm',
);

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
  const updateChecklist = useUpdatePipelineChecklist(lead.id, boardId);
  const deleteChecklist = useDeletePipelineChecklist(lead.id, boardId);
  const createItem = useCreateChecklistItem(lead.id, boardId);
  const updateItem = useUpdateChecklistItem(lead.id, boardId);
  const deleteItem = useDeleteChecklistItem(lead.id, boardId);
  const uploadAttachment = useUploadPipelineAttachment(lead.id, boardId);
  const deleteAttachment = useDeletePipelineAttachment(lead.id, boardId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [addingItemChecklistId, setAddingItemChecklistId] = useState<number | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [showCreateChecklist, setShowCreateChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(BOARD_PRESET_COLORS[0]);
  const selectedLabelIds = new Set((lead.labels ?? []).map((l) => l.id));
  const isLead = (lead.card_type ?? 'lead') === 'lead';

  const toggleLabel = (labelId: number) => {
    const next = new Set(selectedLabelIds);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    patchLead({ label_ids: [...next] });
  };

  const handleCreateLabel = () => {
    const name = newLabelName.trim();
    if (!name) return;
    createLabel.mutate(
      { name, color: newLabelColor },
      {
        onSuccess: (label) => {
          const next = new Set(selectedLabelIds);
          next.add(label.id);
          patchLead({ label_ids: [...next] });
          setNewLabelName('');
          setShowCreateLabel(false);
        },
      },
    );
  };

  const handleCreateChecklist = async () => {
    const title = newChecklistTitle.trim() || 'Checklist';
    const checklist = await createChecklist.mutateAsync({
      title,
      description: newChecklistDescription.trim() || null,
    });
    setShowCreateChecklist(false);
    setNewChecklistTitle('');
    setNewChecklistDescription('');
    setAddingItemChecklistId(checklist.id);
    setNewItemTitle('');
    setNewItemDescription('');
  };

  const handleAddItem = async (checklistId: number) => {
    const title = newItemTitle.trim();
    if (!title) return;
    await createItem.mutateAsync({
      checklistId,
      title,
      description: newItemDescription.trim() || null,
    });
    setNewItemTitle('');
    setNewItemDescription('');
    setAddingItemChecklistId(null);
  };

  const openAddItem = (checklistId: number) => {
    setAddingItemChecklistId(checklistId);
    setNewItemTitle('');
    setNewItemDescription('');
  };

  const cancelAddItem = () => {
    setAddingItemChecklistId(null);
    setNewItemTitle('');
    setNewItemDescription('');
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
            <PipelineColorPicker
              value={newLabelColor}
              presets={BOARD_PRESET_COLORS}
              swatchSize="md"
              onChange={setNewLabelColor}
            />
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

      <PipelineFormSection
        title="Checklists"
        icon={CheckSquare}
        description="Break work into sections with a heading and description, then track items under each list."
      >
        {!showCreateChecklist ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowCreateChecklist(true)}
            className="inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add checklist
          </Button>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Checklist heading
              </label>
              <input
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder="e.g. Pre-sale tasks"
                className={cn(pipelineInputClass, 'pl-3 text-sm')}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </label>
              <textarea
                value={newChecklistDescription}
                onChange={(e) => setNewChecklistDescription(e.target.value)}
                rows={2}
                placeholder="What should this checklist cover?"
                className={checklistTextareaClass}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleCreateChecklist}
                loading={createChecklist.isPending}
              >
                Create checklist
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowCreateChecklist(false);
                  setNewChecklistTitle('');
                  setNewChecklistDescription('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {(lead.checklists ?? []).map((checklist) => {
          const items = checklist.items ?? [];
          const done = items.filter((i) => i.is_done).length;
          return (
            <article key={checklist.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    defaultValue={checklist.title}
                    placeholder="Checklist heading"
                    className={cn(pipelineInputClass, 'pl-3 text-sm font-semibold')}
                    onBlur={(e) => {
                      const title = e.target.value.trim() || 'Checklist';
                      if (title !== checklist.title) {
                        updateChecklist.mutate({ id: checklist.id, title });
                      }
                    }}
                  />
                  <textarea
                    defaultValue={checklist.description ?? ''}
                    rows={2}
                    placeholder="Checklist description (optional)"
                    className={checklistTextareaClass}
                    onBlur={(e) => {
                      const description = e.target.value.trim() || null;
                      if (description !== (checklist.description ?? null)) {
                        updateChecklist.mutate({ id: checklist.id, description });
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteChecklist.mutate(checklist.id)}
                  className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
                  aria-label={`Delete checklist ${checklist.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {items.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(done / items.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{done}/{items.length}</span>
                </div>
              )}

              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.is_done}
                        onChange={(e) => updateItem.mutate({ id: item.id, is_done: e.target.checked })}
                        className="mt-1 rounded border-gray-300"
                        aria-label={`Mark ${item.title} as done`}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                          defaultValue={item.title}
                          placeholder="Item heading"
                          className={cn(
                            pipelineInputClass,
                            'pl-3 text-sm',
                            item.is_done && 'text-gray-400 line-through',
                          )}
                          onBlur={(e) => {
                            const title = e.target.value.trim();
                            if (title && title !== item.title) {
                              updateItem.mutate({ id: item.id, title });
                            }
                          }}
                        />
                        <textarea
                          defaultValue={item.description ?? ''}
                          rows={2}
                          placeholder="Item description (optional)"
                          className={cn(checklistTextareaClass, item.is_done && 'text-gray-400')}
                          onBlur={(e) => {
                            const description = e.target.value.trim() || null;
                            if (description !== (item.description ?? null)) {
                              updateItem.mutate({ id: item.id, description });
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteItem.mutate(item.id)}
                        className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
                        aria-label={`Delete item ${item.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {addingItemChecklistId === checklist.id ? (
                <div className="mt-3 space-y-2 rounded-lg border border-dashed border-gray-300 bg-white p-3">
                  <input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Item heading"
                    className={cn(pipelineInputClass, 'pl-3 text-sm')}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleAddItem(checklist.id);
                      }
                      if (e.key === 'Escape') cancelAddItem();
                    }}
                  />
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    rows={2}
                    placeholder="Item description (optional)"
                    className={checklistTextareaClass}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddItem(checklist.id)}
                      loading={createItem.isPending}
                      disabled={!newItemTitle.trim()}
                    >
                      Add item
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={cancelAddItem}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddItem(checklist.id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              )}
            </article>
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
