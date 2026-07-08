import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Crosshair,
  FileText,
  Flag,
  Gauge,
  Hash,
  Plus,
  Target,
  Trash2,
  Type,
  User,
  Users,
} from 'lucide-react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type {
  BoardProgressContext,
  BoardProgressMember,
  BoardTarget,
  BoardTargetType,
  CreateBoardTargetPayload,
} from '../api/boardProgressTypes';
import {
  METRIC_LABELS,
  PROGRESS_PERIOD_OPTIONS,
  PROGRESS_METRIC_KEYS,
  TARGET_TYPE_LABELS,
  metricUnitForKey,
  type ProgressPeriod,
} from '../api/pipelineProgressTerms';
import { useCreateBoardTarget, useUpdateBoardTarget } from '../api/useBoardProgressQueries';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';

interface BoardTargetFormDrawerProps {
  open: boolean;
  onClose: () => void;
  boardId: number;
  context: BoardProgressContext;
  period: ProgressPeriod;
  members: BoardProgressMember[];
  target?: BoardTarget | null;
}

type KeyResultDraft = {
  title: string;
  metric_key: string;
  target_value: string;
};

type FormState = {
  type: BoardTargetType;
  title: string;
  description: string;
  metric_key: string;
  target_value: string;
  scope: 'board' | 'member';
  member_user_id: number | '';
};

const TARGET_TYPE_OPTIONS: {
  value: 'kpi' | 'goal' | 'objective';
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: 'kpi',
    label: 'KPI',
    description: 'Track a core performance number',
    icon: Gauge,
  },
  {
    value: 'goal',
    label: 'Goal',
    description: 'Set a clear outcome to hit',
    icon: Flag,
  },
  {
    value: 'objective',
    label: 'Objective',
    description: 'Bundle key results into an OKR',
    icon: Crosshair,
  },
];

const emptyKeyResult = (): KeyResultDraft => ({
  title: '',
  metric_key: 'cards_won',
  target_value: '',
});

const emptyForm = (): FormState => ({
  type: 'kpi',
  title: '',
  description: '',
  metric_key: 'cards_won',
  target_value: '',
  scope: 'board',
  member_user_id: '',
});

function metricOptions(ctx: BoardProgressContext) {
  return PROGRESS_METRIC_KEYS.map((key) => ({
    value: key,
    label: METRIC_LABELS[key]?.(ctx) ?? key,
  }));
}

function unitLabel(unit: ReturnType<typeof metricUnitForKey>): string {
  switch (unit) {
    case 'currency':
      return 'Amount';
    case 'percent':
      return 'Percent';
    case 'days':
      return 'Days';
    default:
      return 'Count';
  }
}

function unitSuffix(unit: ReturnType<typeof metricUnitForKey>, currency: string): string {
  switch (unit) {
    case 'currency':
      return currency;
    case 'percent':
      return '%';
    case 'days':
      return 'days';
    default:
      return '';
  }
}

function targetValueIconForUnit(unit: ReturnType<typeof metricUnitForKey>): LucideIcon {
  if (unit === 'percent') return BarChart3;
  if (unit === 'days') return CalendarDays;
  return Hash;
}

export default function BoardTargetFormDrawer({
  open,
  onClose,
  boardId,
  context,
  period,
  members,
  target,
}: BoardTargetFormDrawerProps) {
  const isEditing = Boolean(target);
  const createTarget = useCreateBoardTarget(boardId);
  const updateTarget = useUpdateBoardTarget(boardId);
  const isSubmitting = createTarget.isPending || updateTarget.isPending;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [keyResults, setKeyResults] = useState<KeyResultDraft[]>([emptyKeyResult()]);

  const metrics = useMemo(() => metricOptions(context), [context]);
  const metricUnit = metricUnitForKey(form.metric_key);
  const periodLabel = PROGRESS_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (target) {
        setForm({
          type: target.type === 'key_result' ? 'kpi' : target.type,
          title: target.title,
          description: target.description ?? '',
          metric_key: target.metric_key,
          target_value: String(target.target_value),
          scope: target.scope,
          member_user_id: target.member_user_id ?? '',
        });
        setKeyResults([emptyKeyResult()]);
        return;
      }
      setForm(emptyForm());
      setKeyResults([emptyKeyResult()]);
    });
  }, [open, target]);

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.target_value.trim()) return false;
    if (Number.isNaN(Number(form.target_value)) || Number(form.target_value) < 0) return false;
    if (form.scope === 'member' && !form.member_user_id) return false;
    if (!isEditing && form.type === 'objective') {
      const validKrs = keyResults.filter(
        (kr) => kr.title.trim() && kr.target_value.trim() && !Number.isNaN(Number(kr.target_value)),
      );
      if (validKrs.length === 0) return false;
    }
    return true;
  }, [form, isEditing, keyResults]);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const unit = metricUnitForKey(form.metric_key);
    const basePayload: CreateBoardTargetPayload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      metric_key: form.metric_key,
      target_value: Number(form.target_value),
      unit,
      period_type: period,
      scope: form.scope,
      member_user_id: form.scope === 'member' ? Number(form.member_user_id) : null,
    };

    if (isEditing && target) {
      updateTarget.mutate(
        {
          id: target.id,
          data: {
            title: basePayload.title,
            description: basePayload.description,
            metric_key: basePayload.metric_key,
            target_value: basePayload.target_value,
            unit: basePayload.unit,
            period_type: basePayload.period_type,
            scope: basePayload.scope,
            member_user_id: basePayload.member_user_id,
          },
        },
        { onSuccess: onClose },
      );
      return;
    }

    if (form.type === 'objective') {
      basePayload.key_results = keyResults
        .filter((kr) => kr.title.trim() && kr.target_value.trim())
        .map((kr) => ({
          title: kr.title.trim(),
          metric_key: kr.metric_key,
          target_value: Number(kr.target_value),
          unit: metricUnitForKey(kr.metric_key),
          scope: form.scope,
          member_user_id: form.scope === 'member' ? Number(form.member_user_id) : null,
        }));
    }

    createTarget.mutate(basePayload, { onSuccess: onClose });
  };

  const drawerTitle = isEditing ? 'Edit target' : 'Add target';
  const heroDescription = context.is_project_board
    ? `Define what success looks like on this project board for ${periodLabel.toLowerCase()}.`
    : context.is_pipeline_board
      ? `Define what success looks like on this pipeline board for ${periodLabel.toLowerCase()}.`
      : `Define what success looks like on this board for ${periodLabel.toLowerCase()}.`;

  const titlePlaceholder = form.type === 'objective'
    ? context.is_pipeline_board
      ? 'e.g. Grow qualified pipeline wins this quarter'
      : 'e.g. Ship core project milestones this quarter'
    : context.is_pipeline_board
      ? 'e.g. Win 20 leads this month'
      : 'e.g. Complete 15 tasks this month';

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      subtitle={
        isEditing
          ? 'Update this target for the selected period.'
          : 'Group your target details below — type, measure, and ownership.'
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <div className="space-y-5">
        <PipelineModalHero
          icon={Target}
          tone="indigo"
          title={isEditing ? 'Update board target' : 'New board target'}
          description={heroDescription}
        />

        <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-600" />
          <span>
            Period: <span className="font-semibold">{periodLabel}</span>
            {isEditing && target ? (
              <span className="text-violet-700/80"> · editing {TARGET_TYPE_LABELS[target.type] ?? target.type}</span>
            ) : null}
          </span>
        </div>

        {!isEditing && (
          <PipelineFormSection
            title="Target type"
            icon={Crosshair}
            description="Choose how this target should be tracked on the board."
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {TARGET_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = form.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, type: option.value }))}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                      selected
                        ? 'border-violet-500 bg-violet-50 shadow-sm ring-1 ring-violet-500/20'
                        : 'border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/30',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex rounded-lg p-2',
                        selected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {form.type === 'objective' && (
              <p className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-800">
                Objectives roll up progress from the key results you add in the last section.
              </p>
            )}
          </PipelineFormSection>
        )}

        <PipelineFormSection
          title="What you're aiming for"
          icon={Type}
          description="Give the target a clear name and optional context for the team."
        >
          <PipelineIconField label="Title" icon={Type} required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className={pipelineInputClass}
              placeholder={titlePlaceholder}
            />
          </PipelineIconField>

          <PipelineIconField label="Description" icon={FileText} hint="Optional — helps everyone understand why this target matters.">
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className={cn(pipelineInputClass, 'min-h-[80px] resize-y pl-3')}
              placeholder="What does success look like?"
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection
          title="Measure & target"
          icon={Activity}
          description="Pick the metric and the number you want to reach in this period."
        >
          <PipelineIconField label="Metric" icon={Activity} required>
            <select
              value={form.metric_key}
              onChange={(e) => setForm((prev) => ({ ...prev, metric_key: e.target.value }))}
              className={pipelineSelectClass}
              aria-label="Metric"
            >
              {metrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </PipelineIconField>

          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label={`Target ${unitLabel(metricUnit).toLowerCase()}`} icon={targetValueIconForUnit(metricUnit)} required>
              <input
                type="number"
                min={0}
                step="any"
                value={form.target_value}
                onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))}
                className={pipelineInputClass}
                placeholder="0"
              />
            </PipelineIconField>
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Unit</p>
                <p className="mt-0.5 font-semibold text-gray-800">
                  {unitLabel(metricUnit)}
                  {unitSuffix(metricUnit, context.currency) ? (
                    <span className="ml-1 font-normal text-gray-500">({unitSuffix(metricUnit, context.currency)})</span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </PipelineFormSection>

        <PipelineFormSection
          title="Ownership"
          icon={Users}
          description="Track this target for the whole board or a specific team member."
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, scope: 'board', member_user_id: '' }))}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                form.scope === 'board'
                  ? 'border-violet-500 bg-violet-50 text-violet-800'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50',
              )}
            >
              <Users className="h-4 w-4" />
              Whole board
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, scope: 'member' }))}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                form.scope === 'member'
                  ? 'border-violet-500 bg-violet-50 text-violet-800'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50',
              )}
            >
              <User className="h-4 w-4" />
              Individual
            </button>
          </div>

          {form.scope === 'member' && (
            <PipelineIconField label="Team member" icon={User} required>
              <select
                value={form.member_user_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    member_user_id: e.target.value ? Number(e.target.value) : '',
                  }))
                }
                className={pipelineSelectClass}
                aria-label="Team member"
              >
                <option value="">Select member…</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </PipelineIconField>
          )}
        </PipelineFormSection>

        {!isEditing && form.type === 'objective' && (
          <PipelineFormSection
            title="Key results"
            icon={Target}
            description="Add measurable outcomes that roll up into this objective."
            className="border-violet-200"
          >
            <div className="space-y-3">
              {keyResults.map((kr, index) => {
                const krUnit = metricUnitForKey(kr.metric_key);
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-violet-100 bg-violet-50/30 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">Key result {index + 1}</span>
                      </div>
                      {keyResults.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setKeyResults((prev) => prev.filter((_, i) => i !== index))}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                          aria-label={`Remove key result ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <PipelineIconField label="Title" icon={Type} required>
                        <input
                          type="text"
                          value={kr.title}
                          onChange={(e) =>
                            setKeyResults((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)),
                            )
                          }
                          className={pipelineInputClass}
                          placeholder="e.g. Close 10 won deals"
                        />
                      </PipelineIconField>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <PipelineIconField label="Metric" icon={Activity} required>
                          <select
                            value={kr.metric_key}
                            onChange={(e) =>
                              setKeyResults((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, metric_key: e.target.value } : item,
                                ),
                              )
                            }
                            className={pipelineSelectClass}
                            aria-label={`Key result ${index + 1} metric`}
                          >
                            {metrics.map((metric) => (
                              <option key={metric.value} value={metric.value}>
                                {metric.label}
                              </option>
                            ))}
                          </select>
                        </PipelineIconField>

                        <PipelineIconField
                          label={`Target (${unitLabel(krUnit).toLowerCase()})`}
                          icon={Hash}
                          required
                        >
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={kr.target_value}
                            onChange={(e) =>
                              setKeyResults((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { ...item, target_value: e.target.value } : item,
                                ),
                              )
                            }
                            className={pipelineInputClass}
                            placeholder="0"
                          />
                        </PipelineIconField>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex items-center gap-2"
              onClick={() => setKeyResults((prev) => [...prev, emptyKeyResult()])}
            >
              <Plus className="h-4 w-4" />
              Add key result
            </Button>
          </PipelineFormSection>
        )}
      </div>
    </SlideDrawer>
  );
}
