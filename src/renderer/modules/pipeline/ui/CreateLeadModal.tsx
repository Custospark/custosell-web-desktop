import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineLead, usePipelineBoards, usePipelineKanban, usePipelineSources } from '../api/usePipelineQueries';
import type { PipelineCardType } from '../api/pipelineTypes';
import MultiAssigneeSelect from './MultiAssigneeSelect';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';
import {
  DollarSign, Kanban, Mail, Phone, Tag, User, UserPlus, UserRound,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  boardId?: number;
  stageId?: number;
  /** When set, card type selector is hidden and this type is used automatically */
  defaultCardType?: PipelineCardType;
}

export default function CreateLeadModal({ open, boardId: fixedBoardId, stageId: fixedStageId, onClose, defaultCardType }: CreateLeadModalProps) {
  const createLead = useCreatePipelineLead();
  const { data: boards = [] } = usePipelineBoards();
  const { data: sources } = usePipelineSources();

  const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('');
  const [selectedStageId, setSelectedStageId] = useState<number | ''>('');

  const defaultBoardId = useMemo(
    () => (boards.find((b) => b.is_default) ?? boards[0])?.id,
    [boards],
  );

  const resolvedBoardId = fixedBoardId
    ?? (selectedBoardId !== '' ? selectedBoardId : defaultBoardId);

  const { data: kanbanBoard } = usePipelineKanban(resolvedBoardId ?? 0);
  const stages = useMemo(
    () => [...(kanbanBoard?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [kanbanBoard?.stages],
  );

  const resolvedStageId = fixedStageId
    ?? (selectedStageId !== '' ? selectedStageId : stages[0]?.id);

  const boardSelectValue = fixedBoardId ?? (selectedBoardId !== '' ? selectedBoardId : defaultBoardId) ?? '';
  const stageSelectValue = fixedStageId ?? (selectedStageId !== '' ? selectedStageId : stages[0]?.id) ?? '';

  const [title, setTitle] = useState('');
  const [cardType, setCardType] = useState<PipelineCardType>(defaultCardType ?? 'lead');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

  const reset = () => {
    setTitle('');
    setCardType(defaultCardType ?? 'lead');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setEstimatedValue('');
    setSourceId('');
    setAssigneeIds([]);
    setSelectedBoardId('');
    setSelectedStageId('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !resolvedBoardId || !resolvedStageId) return;
    await createLead.mutateAsync({
      board_id: resolvedBoardId,
      stage_id: resolvedStageId,
      title: title.trim(),
      card_type: cardType,
      contact_name: cardType === 'lead' ? (contactName.trim() || undefined) : undefined,
      contact_email: cardType === 'lead' ? (contactEmail.trim() || undefined) : undefined,
      contact_phone: cardType === 'lead' ? (contactPhone.trim() || undefined) : undefined,
      estimated_value: cardType === 'lead' && estimatedValue ? Number(estimatedValue) : undefined,
      source_id: cardType === 'lead' && sourceId ? Number(sourceId) : undefined,
      assignee_ids: assigneeIds.length ? assigneeIds : undefined,
      assigned_to: assigneeIds[0],
    });
    handleClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Add card" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={defaultCardType === 'card' ? Kanban : UserPlus}
          tone={defaultCardType === 'card' ? 'indigo' : 'emerald'}
          title={defaultCardType === 'card' ? 'New task' : 'New card'}
          description={defaultCardType === 'card'
            ? 'Add a task card to this column. Team members can be assigned to work on it.'
            : 'Add a sales lead or a general project/task card to this column.'}
        />

        {!defaultCardType && (
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'lead' as const, label: 'Sales lead', icon: UserPlus, hint: 'CRM contact & value' },
            { value: 'card' as const, label: 'Project card', icon: Kanban, hint: 'Tasks & projects' },
          ]).map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCardType(value)}
              className={cn(
                'rounded-xl border p-3 text-left',
                cardType === value ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-gray-200',
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-gray-500">{hint}</p>
            </button>
          ))}
        </div>
        )}

        {!fixedBoardId && (
          <PipelineFormSection title="Board & column" icon={Kanban}>
            <div className="grid gap-4 sm:grid-cols-2">
              <PipelineIconField label="Board" icon={Kanban} required>
                <select
                  value={boardSelectValue}
                  onChange={(e) => {
                    setSelectedBoardId(e.target.value ? Number(e.target.value) : '');
                    setSelectedStageId('');
                  }}
                  className={pipelineSelectClass}
                  required
                >
                  <option value="">Select board</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </PipelineIconField>
              <PipelineIconField label="Column" icon={Kanban} required>
                <select
                  value={stageSelectValue}
                  onChange={(e) => setSelectedStageId(e.target.value ? Number(e.target.value) : '')}
                  className={pipelineSelectClass}
                  required
                  disabled={!resolvedBoardId || !stages.length}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </PipelineIconField>
            </div>
          </PipelineFormSection>
        )}

        <PipelineFormSection title="Card details" icon={Tag}>
          <PipelineIconField label="Title" icon={Tag} required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={pipelineInputClass}
              placeholder="e.g. Acme Corp — annual contract"
              required
              autoFocus
            />
          </PipelineIconField>
        </PipelineFormSection>

        {cardType === 'lead' && (
        <PipelineFormSection title="Contact" icon={User}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Contact name" icon={User}>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={pipelineInputClass}
                placeholder="Full name"
              />
            </PipelineIconField>
            <PipelineIconField label="Phone" icon={Phone}>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={pipelineInputClass}
                placeholder="+256 …"
              />
            </PipelineIconField>
          </div>
          <PipelineIconField label="Email" icon={Mail}>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={pipelineInputClass}
              placeholder="contact@company.com"
            />
          </PipelineIconField>
        </PipelineFormSection>
        )}

        {cardType === 'lead' && (
        <PipelineFormSection title="Deal info" icon={DollarSign}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Estimated value" icon={DollarSign}>
              <input
                type="number"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className={pipelineInputClass}
                placeholder="0"
              />
            </PipelineIconField>
            <PipelineIconField label="Source" icon={Tag}>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={pipelineSelectClass}
              >
                <option value="">Select source</option>
                {(sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>
          <PipelineIconField label="Assign to" icon={UserRound}>
            <MultiAssigneeSelect value={assigneeIds} onChange={setAssigneeIds} />
          </PipelineIconField>
        </PipelineFormSection>
        )}

        {cardType === 'card' && (
        <PipelineFormSection title="Assignment" icon={UserRound}>
          <PipelineIconField label="Assign to" icon={UserRound}>
            <MultiAssigneeSelect value={assigneeIds} onChange={setAssigneeIds} />
          </PipelineIconField>
        </PipelineFormSection>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={createLead.isPending} disabled={!resolvedBoardId || !resolvedStageId} className="inline-flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Add card
          </Button>
        </div>
      </form>
    </Modal>
  );
}
