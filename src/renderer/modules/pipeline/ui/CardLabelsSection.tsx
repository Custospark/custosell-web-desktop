import { useState } from 'react';
import type { PipelineLead, PipelinePriority, PipelineLabel } from '../api/pipelineTypes';
import {
  usePipelineLabels,
  useCreatePipelineLabel,
  useUpdatePipelineLabel,
  useDeletePipelineLabel,
} from '../api/usePipelineQueries';
import { PipelineFormSection, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import PipelineColorPicker from './PipelineColorPicker';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';
import { Plus, Tag, X, Pencil, Check } from 'lucide-react';

const PRIORITIES: { value: PipelinePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

interface CardLabelsSectionProps {
  lead: PipelineLead;
  boardId: number;
  canEdit?: boolean;
  onPatchLead: (payload: Record<string, unknown>) => void;
}

export default function CardLabelsSection({ lead, boardId, canEdit = true, onPatchLead }: CardLabelsSectionProps) {
  const { data: boardLabels = [] } = usePipelineLabels(boardId);
  const createLabel = useCreatePipelineLabel(boardId);
  const updateLabel = useUpdatePipelineLabel(boardId);
  const deleteLabel = useDeletePipelineLabel(boardId);
  const { confirm } = useConfirm();
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(BOARD_PRESET_COLORS[0]);
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const selectedLabelIds = new Set((lead.labels ?? []).map((l) => l.id));

  const toggleLabel = (labelId: number) => {
    if (!canEdit) return;
    const next = new Set(selectedLabelIds);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    onPatchLead({ label_ids: [...next] });
  };

  const handleCreateLabel = () => {
    if (!canEdit) return;
    const name = newLabelName.trim();
    if (!name) return;
    createLabel.mutate(
      { name, color: newLabelColor },
      {
        onSuccess: (label) => {
          const next = new Set(selectedLabelIds);
          next.add(label.id);
          onPatchLead({ label_ids: [...next] });
          setNewLabelName('');
          setShowCreateLabel(false);
        },
      },
    );
  };

  const handleDeleteLabel = async (label: PipelineLabel) => {
    const ok = await confirm({
      title: 'Delete label?',
      message: `"${label.name}" will be removed from this board and all cards.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    deleteLabel.mutate(label.id);
  };

  const startEdit = (label: PipelineLabel) => {
    setEditingLabelId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const saveEdit = () => {
    if (editingLabelId === null || !editName.trim()) return;
    updateLabel.mutate({ id: editingLabelId, name: editName.trim(), color: editColor });
    setEditingLabelId(null);
  };

  const cancelEdit = () => {
    setEditingLabelId(null);
    setEditName('');
    setEditColor('');
  };

  return (
    <PipelineFormSection title="Labels" icon={Tag}>
      {boardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {boardLabels.map((label) => {
            if (editingLabelId === label.id) {
              return (
                <div key={label.id} className="w-full rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Label name"
                      className={cn(pipelineInputClass, 'h-8 flex-1 px-2.5 text-sm')}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button type="button" onClick={saveEdit} disabled={!editName.trim()} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={cancelEdit} className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                  </div>
                  <PipelineColorPicker
                    value={editColor}
                    presets={BOARD_PRESET_COLORS}
                    swatchSize="sm"
                    onChange={setEditColor}
                  />
                </div>
              );
            }
            return (
              <div key={label.id} className="group relative">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleLabel(label.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold text-white transition-opacity',
                    selectedLabelIds.has(label.id) ? 'opacity-100 ring-2 ring-offset-1 ring-gray-400' : 'opacity-50 hover:opacity-80',
                  )}
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </button>
                {canEdit && (
                  <div className="absolute -right-1.5 -top-1.5 hidden gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(label); }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-blue-600 hover:ring-blue-300"
                      title="Edit label"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleDeleteLabel(label); }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-red-600 hover:ring-red-300"
                      title="Delete label"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {canEdit && (showCreateLabel ? (
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
      ))}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Priority</p>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={!canEdit}
              onClick={() => onPatchLead({
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
      </div>
    </PipelineFormSection>
  );
}
