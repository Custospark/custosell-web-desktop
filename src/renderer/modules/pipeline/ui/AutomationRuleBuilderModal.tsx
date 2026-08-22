import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { pipelineInputClass, pipelineSelectClass, PipelineFormSection } from './pipelineFormFields';
import {
  useCreateAutomationRule,
  useUpdateAutomationRule,
} from '../api/usePipelineAutomationRuleQueries';
import type {
  AutomationActionConfig,
  AutomationCondition,
  AutomationTriggerConfig,
  PipelineAutomationRule,
} from '../api/pipelineAutomationRuleTypes';
import { localTimeToUtc, utcTimeToLocal } from '../api/automationTimeUtils';
import { usePipelineMemberRoster } from '../api/usePipelineMemberRoster';
import { usePipelineLabels } from '../api/usePipelineMetaQueries';
import { usePipelineBoardMetaFields } from '../api/usePipelineMetaFieldQueries';
import {
  ACTION_OPTIONS,
  CARD_TYPE_OPTIONS,
  CONDITION_FIELD_OPTIONS,
  FREQUENCY_OPTIONS,
  PRIORITY_OPTIONS,
  SCHEDULED_TRIGGERS,
  STATUS_OPTIONS,
  TRIGGER_OPTIONS,
  WEEKDAY_OPTIONS,
  isValidRuleDraft,
  operatorsForField,
} from './automationRuleBuilderOptions';
import { usePipelineKanban } from '../api/usePipelineBoardQueries';
import ActionDetails from './AutomationRuleActionDetails';
import { PipelineNumberInput } from './PipelineNumberInput';
import { Plus, Trash2, Sparkles } from 'lucide-react';

interface AutomationRuleBuilderModalProps {
  boardId: number;
  open: boolean;
  mode: 'create' | 'edit';
  rule?: PipelineAutomationRule;
  onClose: () => void;
}

export default function AutomationRuleBuilderModal({
  boardId,
  open,
  mode,
  rule,
  onClose,
}: AutomationRuleBuilderModalProps) {
  const createRule = useCreateAutomationRule(boardId);
  const updateRule = useUpdateAutomationRule(boardId);
  const { data: kanbanBoard } = usePipelineKanban(boardId, { poll: open });
  const stages = kanbanBoard?.stages ?? [];
  const members = usePipelineMemberRoster(boardId);
  const { data: labels = [] } = usePipelineLabels(boardId);
  const { data: metaFields = [] } = usePipelineBoardMetaFields(boardId);

  const [name, setName] = useState(rule?.name ?? '');
  const [trigger, setTrigger] = useState<AutomationTriggerConfig>(
    () => rule?.trigger ?? { type: 'stage_entered' },
  );
  const [conditions, setConditions] = useState<AutomationCondition[]>(() => rule?.conditions ?? []);
  const [actions, setActions] = useState<AutomationActionConfig[]>(() =>
    rule?.actions?.length ? rule.actions : [{ type: 'move_to_stage' as const }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isScheduled = useMemo(
    () => SCHEDULED_TRIGGERS.includes(trigger.type),
    [trigger.type],
  );
  const frequency = trigger.frequency ?? 'once';

  const updateTrigger = (patch: Partial<AutomationTriggerConfig>) => {
    setTrigger((current) => ({ ...current, ...patch }));
  };

  const updateCondition = (index: number, patch: Partial<AutomationCondition>) => {
    setConditions((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const updateAction = (index: number, patch: Partial<AutomationActionConfig>) => {
    setActions((current) => current.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const handleSave = async () => {
    setError('');
    if (!isValidRuleDraft({ name, trigger, actions })) {
      setError('Give the automation a name, a trigger, and at least one action.');
      return;
    }

    const payload = {
      name: name.trim(),
      trigger: { ...trigger },
      conditions: conditions.length > 0 ? conditions : null,
      actions,
    };

    setSaving(true);
    try {
      if (mode === 'edit' && rule) {
        await updateRule.mutateAsync({ ruleId: rule.id, payload });
      } else {
        await createRule.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error toast already handled by the query hooks.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit automation' : 'New automation'}
      subtitle="When the trigger happens, if conditions match, the actions run."
      size="xl"
      panelClassName="max-w-4xl"
      bodyClassName="space-y-4 px-4 py-4 sm:px-6"
    >
      <div className="rounded-xl border border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 to-purple-50 px-4 py-3">
        <label htmlFor="automation-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Automation name <span className="text-red-500">*</span>
        </label>
        <input
          id="automation-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Escalate high-value leads"
          className={pipelineInputClass}
        />
      </div>

      <PipelineFormSection title="Trigger" icon={Sparkles} description="What starts this automation.">
        <div>
          <label htmlFor="automation-trigger" className="mb-1.5 block text-sm font-medium text-gray-700">When</label>
          <select
            id="automation-trigger"
            value={trigger.type}
            onChange={(e) => updateTrigger({ type: e.target.value as AutomationTriggerConfig['type'] })}
            className={pipelineSelectClass}
          >
            {TRIGGER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {(trigger.type === 'stage_entered' || trigger.type === 'stage_exited' || trigger.type === 'stage_dwell') && (
          <div>
            <label htmlFor="automation-trigger-stage" className="mb-1.5 block text-sm font-medium text-gray-700">Stage</label>
            <select
              id="automation-trigger-stage"
              value={trigger.stage_id ?? ''}
              onChange={(e) => updateTrigger({ stage_id: e.target.value ? Number(e.target.value) : null })}
              className={pipelineSelectClass}
            >
              <option value="">Any stage</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {(trigger.type === 'overdue_by' ||
          trigger.type === 'before_due' ||
          trigger.type === 'stage_dwell' ||
          trigger.type === 'no_activity' ||
          trigger.type === 'created_x_days_ago') && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {trigger.type === 'stage_dwell' ? 'Days in stage' : 'Days'}
            </label>
            <PipelineNumberInput
              value={trigger.offset_days ?? 0}
              onChange={(value) => updateTrigger({ offset_days: value })}
              min={0}
            />
          </div>
        )}

        {trigger.type === 'recurring' && (
          <div className="rounded-lg border border-fuchsia-100 bg-fuchsia-50/40 px-3 py-2.5 text-xs text-fuchsia-900/80">
            Recurring rules create one card every time the schedule fires - ideal for weekly reviews, monthly follow-ups, and routine tasks.
          </div>
        )}

        {isScheduled && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Schedule</label>
            <select
              value={frequency}
              onChange={(e) => updateTrigger({ frequency: e.target.value as AutomationTriggerConfig['frequency'] })}
              className={pipelineSelectClass}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {frequency === 'weekly' && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Days of the week</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = (trigger.days_of_week ?? []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          updateTrigger({
                            days_of_week: active
                              ? (trigger.days_of_week ?? []).filter((d) => d !== day.value)
                              : [...(trigger.days_of_week ?? []), day.value].sort(),
                          })
                        }
                        className={
                          active
                            ? 'rounded-lg bg-fuchsia-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm'
                            : 'rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-fuchsia-300'
                        }
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Day of the month</label>
                <PipelineNumberInput
                  value={trigger.day_of_month ?? 1}
                  onChange={(value) => updateTrigger({ day_of_month: value })}
                  min={1}
                  max={31}
                />
              </div>
            )}

            {frequency === 'cron' && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Cron expression</label>
                <input
                  value={trigger.cron ?? ''}
                  onChange={(e) => updateTrigger({ cron: e.target.value })}
                  placeholder="e.g. 0 9 * * 1 (every Monday 9am UTC)"
                  className={pipelineInputClass}
                />
              </div>
            )}

            {frequency !== 'cron' && (
              <div className="mt-3">
                <label htmlFor="automation-time" className="mb-1.5 block text-xs font-medium text-gray-600">
                  Time ({frequency === 'once' ? 'optional' : 'required'})
                </label>
                <input
                  id="automation-time"
                  type="time"
                  value={utcTimeToLocal(trigger.time ?? '00:00')}
                  onChange={(e) => updateTrigger({ time: localTimeToUtc(e.target.value) })}
                  className={pipelineInputClass}
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Shown in your local time and stored in UTC.
                </p>
              </div>
            )}
          </div>
        )}
      </PipelineFormSection>

      <PipelineFormSection
        title={`Conditions${conditions.length > 0 ? ` (${conditions.length})` : ''}`}
        icon={Sparkles}
        description="Optional - only run when every condition matches."
      >
        {conditions.map((condition, index) => {
          const operators = operatorsForField(condition.field);
          return (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-100 bg-white p-2">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Field</label>
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value as AutomationCondition['field'], value: undefined })}
                  className={pipelineSelectClass}
                >
                  {CONDITION_FIELD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[120px] flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Operator</label>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, { operator: e.target.value as AutomationCondition['operator'] })}
                  className={pipelineSelectClass}
                >
                  {operators.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[120px] flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Value</label>
                {condition.field === 'stage_id' ? (
                  <select
                    value={(condition.value as number) ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : null })}
                    className={pipelineSelectClass}
                  >
                    <option value="">Select stage</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : condition.field === 'status' ? (
                  <select
                    value={(condition.value as string) ?? 'open'}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className={pipelineSelectClass}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : condition.field === 'priority' ? (
                  <select
                    value={(condition.value as string) ?? 'medium'}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className={pipelineSelectClass}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : condition.field === 'card_type' ? (
                  <select
                    value={(condition.value as string) ?? 'lead'}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    className={pipelineSelectClass}
                  >
                    {CARD_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : condition.field === 'assigned_to' ? (
                  <select
                    value={(condition.value as number) ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : null })}
                    className={pipelineSelectClass}
                  >
                    <option value="">Anyone</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : condition.field === 'has_label' ? (
                  <select
                    value={(condition.value as number) ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : null })}
                    className={pipelineSelectClass}
                  >
                    <option value="">Any label</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                ) : condition.field === 'meta' ? (
                  <select
                    value={condition.meta_field_id ?? ''}
                    onChange={(e) => updateCondition(index, { meta_field_id: e.target.value ? Number(e.target.value) : null })}
                    className={pipelineSelectClass}
                  >
                    <option value="">Select custom field</option>
                    {metaFields.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={(condition.value as string) ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                    className={pipelineInputClass}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setConditions((current) => current.filter((_, i) => i !== index))}
                className="mb-1 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                title="Remove condition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setConditions((current) => [...current, { field: 'status', operator: 'is', value: 'open' }])
          }
        >
          <Plus className="h-4 w-4" />
          Add condition
        </Button>
      </PipelineFormSection>

      <PipelineFormSection title="Actions" icon={Sparkles} description="What happens when the automation fires.">
        {actions.map((action, index) => (
          <div key={index} className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Then</label>
                <select
                  value={action.type}
                  onChange={(e) => updateAction(index, { type: e.target.value as AutomationActionConfig['type'] })}
                  className={pipelineSelectClass}
                >
                  {ACTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setActions((current) => current.filter((_, i) => i !== index))}
                className="mb-1 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                title="Remove action"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <ActionDetails
              action={action}
              stages={stages}
              members={members}
              labels={labels}
              metaFields={metaFields}
              onChange={(patch) => updateAction(index, patch)}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setActions((current) => [...current, { type: 'move_to_stage' as const }])}>
          <Plus className="h-4 w-4" />
          Add action
        </Button>
      </PipelineFormSection>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} loading={saving}>
          {mode === 'edit' ? 'Save changes' : 'Create automation'}
        </Button>
      </div>
    </Modal>
  );
}