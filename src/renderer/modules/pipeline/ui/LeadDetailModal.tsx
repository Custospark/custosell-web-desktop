import { Link } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import {
  useConvertPipelineLead,
  useDeletePipelineLead,
  usePipelineLead,
  usePipelineSources,
  useUpdatePipelineLead,
} from '../api/usePipelineQueries';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineInitials,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import LeadCommentsPanel from './LeadCommentsPanel';
import LeadHistoryPanel from './LeadHistoryPanel';
import LeadRemindersPanel from './LeadRemindersPanel';
import MultiAssigneeSelect from './MultiAssigneeSelect';
import { cn } from '../../../shared/utils/cn';
import {
  ArrowRightLeft,
  Bell,
  Check,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  History,
  Mail,
  MessageSquare,
  Palette,
  Phone,
  Tag,
  Trash2,
  Type,
  User,
  UserRound,
} from 'lucide-react';
import type { PipelineLead, PipelineLeadStatus, UpdateLeadPayload } from '../api/pipelineTypes';
import CardDetailExtras from './CardDetailExtras';
import CreateEstimateFromLeadButton from '../../estimates/ui/CreateEstimateFromLeadButton';
import PipelineColorPicker from './PipelineColorPicker';
import { CARD_PRESET_COLORS } from './pipelineColorPresets';
import { LeadDetailSkeleton } from './KanbanBoardSkeleton';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { canManageBoardSettings } from '../../../shared/utils/moduleAccess';

interface LeadDetailModalProps {
  leadId: number;
  boardId?: number;
  board?: {
    created_by?: number | null;
    project_id?: number | null;
    visibility?: string;
    members?: { user_id: number; role: string }[];
  };
  boardAccess?: {
    projectCreatedBy?: number | null;
    projectMembers?: { user_id: number; role: string }[];
  };
  initialLead?: PipelineLead;
  onClose: () => void;
}

const STATUS_STYLES: Record<PipelineLeadStatus, string> = {
  open: 'bg-blue-50 text-blue-800 ring-blue-100',
  won: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  lost: 'bg-red-50 text-red-800 ring-red-100',
  converted: 'bg-violet-50 text-violet-800 ring-violet-100',
  archived: 'bg-gray-100 text-gray-700 ring-gray-200',
};

export default function LeadDetailModal({
  leadId,
  boardId,
  board,
  boardAccess,
  initialLead,
  onClose,
}: LeadDetailModalProps) {
  const user = useAppSelector((s) => s.auth.user);
  const { data: lead, isLoading, isFetching } = usePipelineLead(leadId, true, {
    poll: true,
    initialData: initialLead,
  });
  const { data: sources } = usePipelineSources();
  const updateLead = useUpdatePipelineLead();
  const convertLead = useConvertPipelineLead();
  const deleteLead = useDeletePipelineLead();
  const { confirm } = useConfirm();

  if (!lead && isLoading) {
    return (
      <Modal isOpen onClose={onClose} title="Loading card…" size="xl">
        <LeadDetailSkeleton />
      </Modal>
    );
  }

  if (!lead) {
    return (
      <Modal isOpen onClose={onClose} title="Card unavailable" size="md">
        <p className="py-6 text-center text-sm text-gray-500">This card could not be loaded.</p>
      </Modal>
    );
  }

  const isComplete = lead.status === 'won';

  const canConvert = lead.status !== 'converted' && (lead.card_type ?? 'lead') === 'lead';
  const isLead = (lead.card_type ?? 'lead') === 'lead';
  const stageColor = lead.stage?.color ?? '#6366f1';
  const resolvedBoardId = boardId ?? lead.board_id;
  const patchLead = (payload: UpdateLeadPayload) =>
    updateLead.mutate({ ...payload, id: lead.id, board_id: resolvedBoardId, silent: true });

  const handleConvert = async () => {
    await convertLead.mutateAsync({ id: lead.id, board_id: resolvedBoardId });
  };

  const canArchive = board ? canManageBoardSettings(user, board, boardAccess) : false;

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive card?',
      message: `"${lead.title}" will be removed from the board. This cannot be undone from the UI.`,
      confirmText: 'Archive',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteLead.mutateAsync({
      id: lead.id,
      board_id: boardId ?? lead.board_id,
      card_type: lead.card_type,
    });
    onClose();
  };

  return (
    <Modal
      isOpen
      title={lead.title}
      subtitle={isFetching ? 'Saving…' : (lead.stage?.name ?? undefined)}
      titleCentered
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-5 pb-2">
        {/* Hero strip */}
        <div
          className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${stageColor}18, white 60%)` }}
        >
          <div className="flex items-start gap-4 p-4">
            <button
              type="button"
              onClick={() => patchLead({ status: isComplete ? 'open' : 'won' })}
              className={cn(
                'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                isComplete
                  ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'border-gray-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50',
              )}
              title={isComplete ? 'Mark incomplete' : 'Mark complete'}
              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </button>
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md"
              style={{ backgroundColor: stageColor }}
            >
              {pipelineInitials(lead.contact_name || lead.title)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1', STATUS_STYLES[lead.status])}>
                  {lead.status}
                </span>
                {lead.stage && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-gray-200"
                    style={{ backgroundColor: `${stageColor}15`, color: stageColor }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stageColor }} />
                    {lead.stage.name}
                  </span>
                )}
              </div>
              {lead.estimated_value != null && lead.estimated_value > 0 && (
                <p className="mt-2 text-lg font-semibold text-emerald-700">
                  {formatCurrency(lead.estimated_value, lead.currency)}
                </p>
              )}
              {lead.board && (
                <p className="mt-1 text-xs text-gray-500">Board · {lead.board.name}</p>
              )}
            </div>
          </div>
        </div>

        <PipelineFormSection title="Card details" icon={Type}>
          <PipelineIconField label="Title" icon={Type}>
            <input
              defaultValue={lead.title}
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== lead.title) {
                    patchLead({ title: v });
                }
              }}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Card appearance" icon={Palette}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Background color</label>
            <PipelineColorPicker
              value={lead.background_color}
              presets={CARD_PRESET_COLORS}
              swatchSize="md"
              allowClear
              onClear={() => patchLead({ background_color: null })}
              onChange={(color) => patchLead({ background_color: color })}
            />
          </div>
        </PipelineFormSection>

        <CardDetailExtras lead={lead} boardId={resolvedBoardId} />

        {isLead && (
        <PipelineFormSection title="Contact" icon={User}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Contact name" icon={User}>
              <input
                defaultValue={lead.contact_name ?? ''}
                placeholder="Full name"
                className={pipelineInputClass}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (lead.contact_name ?? '')) {
                    patchLead({ contact_name: v || null });
                  }
                }}
              />
            </PipelineIconField>
            <PipelineIconField label="Phone" icon={Phone}>
              <input
                defaultValue={lead.contact_phone ?? ''}
                placeholder="Phone number"
                className={pipelineInputClass}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (lead.contact_phone ?? '')) {
                    patchLead({ contact_phone: v || null });
                  }
                }}
              />
            </PipelineIconField>
          </div>
          <PipelineIconField label="Email" icon={Mail}>
            <input
              type="email"
              defaultValue={lead.contact_email ?? ''}
              placeholder="Email address"
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (lead.contact_email ?? '')) {
                  patchLead({ contact_email: v || null });
                }
              }}
            />
          </PipelineIconField>
        </PipelineFormSection>
        )}

        <PipelineFormSection title={isLead ? 'Assignment & source' : 'Assignment'} icon={Tag}>
          <div className="grid gap-4 sm:grid-cols-2">
            {isLead && (
            <PipelineIconField label="Source" icon={Tag}>
              <select
                value={lead.source_id ?? ''}
                onChange={(e) => patchLead({ source_id: e.target.value ? Number(e.target.value) : null })}
                className={pipelineSelectClass}
              >
                <option value="">None</option>
                {(sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PipelineIconField>
            )}
            <PipelineIconField label="Assignees" icon={UserRound}>
              <MultiAssigneeSelect
                value={
                  lead.assignees?.map((a) => a.id)
                  ?? (lead.assigned_to ? [lead.assigned_to] : [])
                }
                onChange={(ids) => {
                  patchLead({
                    assignee_ids: ids,
                    assigned_to: ids[0] ?? null,
                  });
                }}
              />
            </PipelineIconField>
          </div>
          {isLead && lead.estimated_value != null && (
            <PipelineIconField label="Deal value" icon={DollarSign}>
              <input
                type="number"
                min="0"
                defaultValue={lead.estimated_value}
                className={pipelineInputClass}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== lead.estimated_value) {
                    patchLead({ estimated_value: v });
                  }
                }}
              />
            </PipelineIconField>
          )}
        </PipelineFormSection>

        {canArchive && (
          <div className="flex justify-end border-t border-gray-100 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleArchive}
              loading={deleteLead.isPending}
              className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Archive card
            </Button>
          </div>
        )}

        {lead.customer && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Linked customer:{' '}
            <Link to={ROUTES.CUSTOMERS.INDEX} className="font-semibold text-blue-600 hover:underline">
              {lead.customer.name}
            </Link>
          </div>
        )}

        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-950">Proposal</p>
              <p className="mt-0.5 text-xs text-blue-800/80">
                Draft a proposal from this card. Link or convert a customer to attach it to the estimate.
              </p>
              <CreateEstimateFromLeadButton lead={lead} className="mt-3" />
            </div>
          </div>
        </div>

        {canConvert && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-violet-950">Ready to convert?</p>
                <p className="mt-0.5 text-xs text-violet-800/80">Creates or links a customer from this lead&apos;s contact info.</p>
                <Button
                  onClick={handleConvert}
                  loading={convertLead.isPending}
                  className="mt-3 inline-flex items-center gap-2"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Convert to customer
                </Button>
              </div>
            </div>
          </div>
        )}

        {lead.status === 'converted' && lead.converted_customer && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>
              Converted to <strong>{lead.converted_customer.name}</strong>
              {lead.converted_at && ` · ${formatShiftDate(lead.converted_at)}`}
            </span>
          </div>
        )}

        <PipelineFormSection title="Reminders" icon={Bell}>
          <LeadRemindersPanel leadId={lead.id} boardId={resolvedBoardId} />
        </PipelineFormSection>

        <PipelineFormSection title="Comments" icon={MessageSquare}>
          <LeadCommentsPanel
            leadId={lead.id}
            boardId={resolvedBoardId}
            board={board}
            boardAccess={boardAccess}
            activities={lead.activities}
          />
        </PipelineFormSection>

        <PipelineFormSection title="History" icon={History}>
          <LeadHistoryPanel activities={lead.activities} currency={lead.currency} />
        </PipelineFormSection>
      </div>
    </Modal>
  );
}
