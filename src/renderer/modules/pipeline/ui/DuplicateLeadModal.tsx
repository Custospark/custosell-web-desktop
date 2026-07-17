import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineLead, usePipelineBoards, usePipelineKanban } from '../api/usePipelineQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import { filterBoardsForWorkspace } from '../api/pipelineBoardWorkspace';
import { PipelineFormSection, PipelineIconField, pipelineSelectClass } from './pipelineFormFields';
import { Kanban, Copy } from 'lucide-react';

interface DuplicateLeadModalProps {
  open: boolean;
  lead: PipelineLead | null;
  boardId: number;
  workspace: 'pipeline' | 'estimates';
  onClose: () => void;
}

export default function DuplicateLeadModal({
  open,
  lead,
  boardId: currentBoardId,
  workspace,
  onClose,
}: DuplicateLeadModalProps) {
  const createLead = useCreatePipelineLead();
  const boardsQueryOptions = workspace === 'estimates'
    ? { estimatesWorkspace: true as const }
    : { salesOnly: true as const };
  const { data: boardsRaw = [] } = usePipelineBoards(boardsQueryOptions);
  const boards = useMemo(
    () => filterBoardsForWorkspace(boardsRaw, workspace),
    [boardsRaw, workspace],
  );

  const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('');
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('');

  const resolvedBoardId = selectedBoardId !== '' ? selectedBoardId : currentBoardId;
  const { data: kanbanBoard, isLoading: kanbanLoading } = usePipelineKanban(resolvedBoardId);
  const stages = useMemo(
    () => [...(kanbanBoard?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [kanbanBoard?.stages],
  );
  const stagesLoaded = kanbanBoard && stages.length > 0;
  const resolvedStageId = selectedStageId !== '' ? selectedStageId : stages[0]?.id;
  const stageIsValid = resolvedStageId && stages.some((s) => s.id === resolvedStageId);

  const handleDuplicate = () => {
    if (!lead || !resolvedBoardId || !stageIsValid) return;
    createLead.mutate({
      board_id: resolvedBoardId,
      stage_id: resolvedStageId,
      title: lead.title,
      card_type: lead.card_type,
      description: lead.description ?? undefined,
      contact_name: lead.contact_name ?? undefined,
      contact_email: lead.contact_email ?? undefined,
      contact_phone: lead.contact_phone ?? undefined,
      source_id: lead.source_id ?? undefined,
      assignee_ids: (lead.assignees ?? []).map((a) => a.id).length
        ? (lead.assignees ?? []).map((a) => a.id)
        : lead.assigned_to
          ? [lead.assigned_to]
          : undefined,
      assigned_to: lead.assigned_to ?? undefined,
      estimated_value: lead.estimated_value ?? undefined,
      currency: lead.currency,
      priority: lead.priority ?? undefined,
      label_ids: (lead.labels ?? []).map((l) => l.id).length
        ? (lead.labels ?? []).map((l) => l.id)
        : undefined,
      due_date: lead.due_date ?? undefined,
      expected_close_date: lead.expected_close_date ?? undefined,
      start_date: lead.start_date ?? undefined,
    });
    onClose();
  };

  const handleClose = () => {
    setSelectedBoardId('');
    setSelectedStageId('');
    onClose();
  };

  const itemLabel = workspace === 'estimates' || lead?.card_type === 'card' ? 'card' : 'lead';

  return (
    <Modal isOpen={open} onClose={handleClose} title={`Duplicate ${itemLabel}`} size="md">
      <div className="space-y-5">
        {lead && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-medium text-gray-500">Source {itemLabel}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">{lead.title}</p>
            {lead.stage && (
              <p className="mt-0.5 text-xs text-gray-500">
                {lead.board?.name ?? 'Current board'} · {lead.stage.name}
              </p>
            )}
          </div>
        )}

        <PipelineFormSection title="Destination board & column" icon={Kanban}>
          <div className="space-y-4">
            <PipelineIconField label="Board" icon={Kanban} required>
              <select
                value={selectedBoardId !== '' ? selectedBoardId : ''}
                onChange={(e) => {
                  setSelectedBoardId(e.target.value ? Number(e.target.value) : '');
                  setSelectedStageId('');
                }}
                className={pipelineSelectClass}
                required
              >
                <option value="">Select board</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.id === currentBoardId ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Column" icon={Kanban} required>
              <select
                value={selectedStageId !== '' ? selectedStageId : stages[0]?.id ?? ''}
                onChange={(e) => setSelectedStageId(e.target.value ? Number(e.target.value) : '')}
                className={pipelineSelectClass}
                required
                disabled={!resolvedBoardId || kanbanLoading || !stagesLoaded}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() => void handleDuplicate()}
            loading={createLead.isPending}
            disabled={!resolvedBoardId || !stageIsValid || kanbanLoading}
            className="inline-flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate {itemLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
