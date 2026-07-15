import { useState } from 'react';
import type { PipelineLead, PipelinePriority } from '../api/pipelineTypes';
import { usePipelineLabels, useCreatePipelineLabel } from '../api/usePipelineQueries';
import { PipelineFormSection, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import PipelineColorPicker from './PipelineColorPicker';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';
import { Plus, Tag } from 'lucide-react';

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
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(BOARD_PRESET_COLORS[0]);
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

  return (
    <PipelineFormSection title="Labels" icon={Tag}>
      {boardLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {boardLabels.map((label) => (
            <button
              key={label.id}
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
          ))}
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
