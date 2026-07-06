import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useDeletePipelineStage } from '../api/usePipelineQueries';
import type { PipelineStage } from '../api/pipelineTypes';
import { PipelineModalHero, pipelineSelectClass } from './pipelineFormFields';
import { AlertTriangle, Columns3 } from 'lucide-react';

interface DeleteStageModalProps {
  open: boolean;
  boardId: number;
  stage: PipelineStage;
  otherStages: PipelineStage[];
  onClose: () => void;
}

export default function DeleteStageModal({
  open,
  boardId,
  stage,
  otherStages,
  onClose,
}: DeleteStageModalProps) {
  const deleteStage = useDeletePipelineStage(boardId);
  const leadCount = stage.leads?.length ?? 0;
  const [migrateTo, setMigrateTo] = useState<number>(otherStages[0]?.id ?? 0);

  const handleDelete = async () => {
    await deleteStage.mutateAsync({
      stageId: stage.id,
      migrate_to_stage_id: leadCount > 0 ? migrateTo : undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Delete column" size="md">
      <div className="space-y-5">
        <PipelineModalHero
          icon={Columns3}
          tone="red"
          title={`Delete "${stage.name}"?`}
          description={
            leadCount > 0
              ? `${leadCount} lead${leadCount === 1 ? '' : 's'} must be moved to another column first.`
              : 'This column is empty and will be removed.'
          }
        />

        {leadCount > 0 && otherStages.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-2 text-sm text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium">Move leads to</p>
                <select
                  value={migrateTo}
                  onChange={(e) => setMigrateTo(Number(e.target.value))}
                  className={`${pipelineSelectClass} mt-2`}
                >
                  {otherStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleteStage.isPending}
            onClick={handleDelete}
            disabled={leadCount > 0 && !migrateTo}
          >
            Delete column
          </Button>
        </div>
      </div>
    </Modal>
  );
}
