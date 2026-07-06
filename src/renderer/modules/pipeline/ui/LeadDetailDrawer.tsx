import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useAddPipelineActivity,
  useConvertPipelineLead,
  useDeletePipelineLead,
  usePipelineLead,
  usePipelineSources,
  useUpdatePipelineLead,
} from '../api/usePipelineQueries';
import { useStaff } from '../../settings/api/settings/StaffQueries';
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
import { cn } from '../../../shared/utils/cn';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Tag,
  Trash2,
  Type,
  User,
  UserRound,
  Video,
} from 'lucide-react';
import type { PipelineActivityType, PipelineLeadStatus } from '../api/pipelineTypes';

interface LeadDetailDrawerProps {
  leadId: number;
  boardId?: number;
  onClose: () => void;
}

const STATUS_STYLES: Record<PipelineLeadStatus, string> = {
  open: 'bg-blue-50 text-blue-800 ring-blue-100',
  won: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  lost: 'bg-red-50 text-red-800 ring-red-100',
  converted: 'bg-violet-50 text-violet-800 ring-violet-100',
  archived: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const ACTIVITY_TYPES: { value: PipelineActivityType; label: string; icon: typeof MessageSquare }[] = [
  { value: 'note', label: 'Note', icon: MessageSquare },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Video },
];

const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Video,
  system: CheckCircle2,
  stage_change: ArrowRightLeft,
};

export default function LeadDetailDrawer({ leadId, boardId, onClose }: LeadDetailDrawerProps) {
  const { data: lead, isLoading } = usePipelineLead(leadId);
  const { data: sources } = usePipelineSources();
  const { data: staff } = useStaff();
  const updateLead = useUpdatePipelineLead();
  const convertLead = useConvertPipelineLead();
  const deleteLead = useDeletePipelineLead();
  const addActivity = useAddPipelineActivity();
  const { confirm } = useConfirm();

  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'meeting'>('note');

  if (isLoading || !lead) {
    return (
      <SlideDrawer open title="Lead" onClose={onClose} hideFooter hideKeyboardTip width="sm:w-[680px]">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </SlideDrawer>
    );
  }

  const canConvert = lead.status !== 'converted';
  const stageColor = lead.stage?.color ?? '#6366f1';

  const handleConvert = async () => {
    await convertLead.mutateAsync({ id: lead.id });
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    await addActivity.mutateAsync({ leadId: lead.id, type: activityType, body: note.trim() });
    setNote('');
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive lead?',
      message: `"${lead.title}" will be removed from the board. This cannot be undone from the UI.`,
      confirmText: 'Archive',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteLead.mutateAsync({ id: lead.id, board_id: boardId ?? lead.board_id });
    onClose();
  };

  const closeDateValue = lead.expected_close_date
    ? lead.expected_close_date.slice(0, 10)
    : '';

  return (
    <SlideDrawer
      open
      title={lead.title}
      subtitle={lead.stage?.name ?? undefined}
      onClose={onClose}
      hideFooter
      hideKeyboardTip
      width="sm:w-[680px]"
    >
      <div className="space-y-5 pb-6">
        {/* Hero strip */}
        <div
          className="overflow-hidden rounded-xl border border-gray-200 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${stageColor}18, white 60%)` }}
        >
          <div className="flex items-start gap-4 p-4">
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

        <PipelineFormSection title="Lead details" icon={Type}>
          <PipelineIconField label="Title" icon={Type}>
            <input
              defaultValue={lead.title}
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== lead.title) {
                  updateLead.mutate({ id: lead.id, title: v });
                }
              }}
            />
          </PipelineIconField>
          <PipelineIconField label="Expected close date" icon={Calendar}>
            <input
              type="date"
              defaultValue={closeDateValue}
              className={pipelineInputClass}
              onBlur={(e) => {
                const v = e.target.value || null;
                const current = lead.expected_close_date?.slice(0, 10) ?? null;
                if (v !== current) {
                  updateLead.mutate({ id: lead.id, expected_close_date: v });
                }
              }}
            />
          </PipelineIconField>
        </PipelineFormSection>

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
                    updateLead.mutate({ id: lead.id, contact_name: v || null });
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
                    updateLead.mutate({ id: lead.id, contact_phone: v || null });
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
                  updateLead.mutate({ id: lead.id, contact_email: v || null });
                }
              }}
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Assignment & source" icon={Tag}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Source" icon={Tag}>
              <select
                value={lead.source_id ?? ''}
                onChange={(e) => updateLead.mutate({ id: lead.id, source_id: e.target.value ? Number(e.target.value) : null })}
                className={pipelineSelectClass}
              >
                <option value="">None</option>
                {(sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Assignee" icon={UserRound}>
              <select
                value={lead.assigned_to ?? ''}
                onChange={(e) => updateLead.mutate({ id: lead.id, assigned_to: e.target.value ? Number(e.target.value) : null })}
                className={pipelineSelectClass}
              >
                <option value="">Unassigned</option>
                {(staff ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>
          {lead.estimated_value != null && (
            <PipelineIconField label="Deal value" icon={DollarSign}>
              <input
                type="number"
                min="0"
                defaultValue={lead.estimated_value}
                className={pipelineInputClass}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== lead.estimated_value) {
                    updateLead.mutate({ id: lead.id, estimated_value: v });
                  }
                }}
              />
            </PipelineIconField>
          )}
        </PipelineFormSection>

        <div className="flex justify-end border-t border-gray-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleArchive}
            loading={deleteLead.isPending}
            className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Archive lead
          </Button>
        </div>

        {lead.customer && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Linked customer:{' '}
            <Link to={ROUTES.CUSTOMERS.INDEX} className="font-semibold text-blue-600 hover:underline">
              {lead.customer.name}
            </Link>
          </div>
        )}

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

        <PipelineFormSection title="Activity" icon={Calendar}>
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActivityType(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                  activityType === value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <MessageSquare className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log a note, call summary, or next step…"
                className={pipelineInputClass}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
              />
            </div>
            <Button
              type="button"
              onClick={handleAddNote}
              loading={addActivity.isPending}
              disabled={!note.trim()}
              className="inline-flex shrink-0 items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              Add
            </Button>
          </div>

          <ul className="space-y-2 pt-1">
            {(lead.activities ?? []).length === 0 ? (
              <li className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-500">
                No activity yet — log your first touchpoint above.
              </li>
            ) : (
              (lead.activities ?? []).map((a) => {
                const Icon = ACTIVITY_ICONS[a.type] ?? MessageSquare;
                return (
                  <li key={a.id} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold capitalize text-gray-700">
                          {a.type.replace('_', ' ')}
                        </span>
                        {a.created_at && (
                          <span className="text-[11px] text-gray-400">{formatShiftDate(a.created_at)}</span>
                        )}
                      </div>
                      {a.body && <p className="mt-1 text-sm leading-relaxed text-gray-800">{a.body}</p>}
                      {a.user && <p className="mt-1 text-[11px] text-gray-500">{a.user.name}</p>}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </PipelineFormSection>
      </div>
    </SlideDrawer>
  );
}
