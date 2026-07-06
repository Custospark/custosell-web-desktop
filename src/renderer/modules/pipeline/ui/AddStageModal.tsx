import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineStage } from '../api/usePipelineQueries';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
} from './pipelineFormFields';
import { Columns3, Palette, Type } from 'lucide-react';
import PipelineColorPicker from './PipelineColorPicker';
import { BOARD_PRESET_COLORS } from './pipelineColorPresets';

interface AddStageModalProps {
  open: boolean;
  boardId: number;
  onClose: () => void;
}

const COLUMN_PRESET_COLORS = ['#64748b', ...BOARD_PRESET_COLORS.filter((c) => c !== '#64748b')];

export default function AddStageModal({ open, boardId, onClose }: AddStageModalProps) {
  const createStage = useCreatePipelineStage(boardId);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748b');

  const reset = () => {
    setName('');
    setColor('#64748b');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createStage.mutateAsync({ name: name.trim(), color });
    handleClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Add column" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={Columns3}
          tone="slate"
          title="New column"
          description="Add a stage to your pipeline board."
        />

        <PipelineFormSection title="Column name" icon={Type}>
          <PipelineIconField label="Name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Negotiation"
              className={pipelineInputClass}
              required
              autoFocus
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Color" icon={Palette}>
          <PipelineColorPicker value={color} presets={COLUMN_PRESET_COLORS} onChange={setColor} />
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createStage.isPending}>
            Add column
          </Button>
        </div>
      </form>
    </Modal>
  );
}
