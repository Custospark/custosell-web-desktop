import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useReorderPipelineStages, useUpdatePipelineStage } from '../api/usePipelineQueries';
import type { PipelineStage } from '../api/pipelineTypes';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import { ArrowLeft, ArrowRight, Columns3, Palette, Type } from 'lucide-react';
import PipelineColorPicker from './PipelineColorPicker';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';

interface EditStageModalProps {
  open: boolean;
  boardId: number;
  stage: PipelineStage;
  allStages: PipelineStage[];
  onClose: () => void;
  onDelete: () => void;
}

const COLUMN_PRESET_COLORS = ['#64748b', ...BOARD_PRESET_COLORS.filter((c) => c !== '#64748b')];

export default function EditStageModal({
  open,
  boardId,
  stage,
  allStages,
  onClose,
  onDelete,
}: EditStageModalProps) {
  const updateStage = useUpdatePipelineStage(boardId);
  const reorderStages = useReorderPipelineStages(boardId);

  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color ?? '#64748b');

  const sorted = [...allStages].sort((a, b) => a.sort_order - b.sort_order);
  const stageIndex = sorted.findIndex((s) => s.id === stage.id);
  const canMoveLeft = stageIndex > 0;
  const canMoveRight = stageIndex < sorted.length - 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateStage.mutateAsync({ stageId: stage.id, name: name.trim(), color });
    onClose();
  };

  const handleMove = async (direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? stageIndex - 1 : stageIndex + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const ids = sorted.map((s) => s.id);
    [ids[stageIndex], ids[newIndex]] = [ids[newIndex], ids[stageIndex]];
    await reorderStages.mutateAsync(ids);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit column" size="md">
      <form key={stage.id} onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Columns3}
          tone="slate"
          title="Column settings"
          description="Rename, recolor, or reorder this stage."
        />

        <PipelineFormSection title="Column name" icon={Type}>
          <PipelineIconField label="Name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={pipelineInputClass}
              required
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Color" icon={Palette}>
          <PipelineColorPicker value={color} presets={COLUMN_PRESET_COLORS} onChange={setColor} />
        </PipelineFormSection>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!canMoveLeft}
            onClick={() => handleMove('left')}
            className="inline-flex flex-1 items-center justify-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Move left
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canMoveRight}
            onClick={() => handleMove('right')}
            className="inline-flex flex-1 items-center justify-center gap-1"
          >
            Move right
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Delete column
          </Button>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateStage.isPending}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
