import { useState } from 'react';
import type { PipelineLead } from '../api/pipelineTypes';
import {
  useCreateChecklistItem,
  useCreatePipelineChecklist,
  useDeleteChecklistItem,
  useDeletePipelineChecklist,
  useUpdateChecklistItem,
  useUpdatePipelineChecklist,
} from '../api/usePipelineQueries';
import { PipelineFormSection, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';

const checklistTextareaClass = cn(
  pipelineInputClass,
  'resize-none pl-3 text-sm',
);

interface CardChecklistsSectionProps {
  lead: PipelineLead;
  boardId: number;
  canEdit?: boolean;
}

export default function CardChecklistsSection({ lead, boardId, canEdit = true }: CardChecklistsSectionProps) {
  const createChecklist = useCreatePipelineChecklist(lead.id, boardId);
  const updateChecklist = useUpdatePipelineChecklist(lead.id, boardId);
  const deleteChecklist = useDeletePipelineChecklist(lead.id, boardId);
  const createItem = useCreateChecklistItem(lead.id, boardId);
  const updateItem = useUpdateChecklistItem(lead.id, boardId);
  const deleteItem = useDeleteChecklistItem(lead.id, boardId);

  const [addingItemChecklistId, setAddingItemChecklistId] = useState<number | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [showCreateChecklist, setShowCreateChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');

  const handleCreateChecklist = async () => {
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    <PipelineFormSection
      title="Checklists"
      icon={CheckSquare}
      description="Break work into sections with a heading and description, then track items under each list."
    >
      {canEdit && (!showCreateChecklist ? (
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
      ))}

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
                  readOnly={!canEdit}
                  disabled={!canEdit}
                  className={cn(pipelineInputClass, 'pl-3 text-sm font-semibold', !canEdit && 'bg-gray-50')}
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
                  readOnly={!canEdit}
                  disabled={!canEdit}
                  className={cn(checklistTextareaClass, !canEdit && 'bg-gray-50')}
                  onBlur={(e) => {
                    const description = e.target.value.trim() || null;
                    if (description !== (checklist.description ?? null)) {
                      updateChecklist.mutate({ id: checklist.id, description });
                    }
                  }}
                />
              </div>
              {canEdit && (
              <button
                type="button"
                onClick={() => deleteChecklist.mutate(checklist.id)}
                className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
                aria-label={`Delete checklist ${checklist.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              )}
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
                <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-2.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      disabled={!canEdit}
                      onChange={(e) => {
                        if (!canEdit) return;
                        updateItem.mutate({ id: item.id, is_done: e.target.checked });
                      }}
                      className="mt-1 rounded border-gray-300"
                      aria-label={`Mark ${item.title} as done`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        defaultValue={item.title}
                        placeholder="Item heading"
                        readOnly={!canEdit}
                        disabled={!canEdit}
                        className={cn(
                          pipelineInputClass,
                          'pl-3 text-sm',
                          item.is_done && 'text-gray-400 line-through',
                          !canEdit && 'bg-gray-50',
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
                        readOnly={!canEdit}
                        disabled={!canEdit}
                        className={cn(checklistTextareaClass, item.is_done && 'text-gray-400', !canEdit && 'bg-gray-50')}
                        onBlur={(e) => {
                          const description = e.target.value.trim() || null;
                          if (description !== (item.description ?? null)) {
                            updateItem.mutate({ id: item.id, description });
                          }
                        }}
                      />
                    </div>
                    {canEdit && (
                    <button
                      type="button"
                      onClick={() => deleteItem.mutate(item.id)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
                      aria-label={`Delete item ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {canEdit && (addingItemChecklistId === checklist.id ? (
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
            ))}
          </article>
        );
      })}
    </PipelineFormSection>
  );
}
