import { Button } from '../../../shared/components/buttons/Button';
import { pipelineInputClass, pipelineSelectClass, PipelineFormSection } from './pipelineFormFields';
import type {
  AutomationCondition,
  AutomationConditionField,
} from '../api/pipelineAutomationRuleTypes';
import {
  CARD_TYPE_OPTIONS,
  CONDITION_FIELD_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  operatorsForField,
} from './automationRuleBuilderOptions';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface AutomationConditionBuilderProps {
  conditions: AutomationCondition[];
  conditionsLogic: 'and' | 'or';
  onLogicChange: (logic: 'and' | 'or') => void;
  onChange: (index: number, patch: Partial<AutomationCondition>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  stages: { id: number; name: string }[];
  members: { id: number; name: string }[];
  labels: { id: number; name: string }[];
  metaFields: { id: number; name: string }[];
}

export default function AutomationConditionBuilder({
  conditions,
  conditionsLogic,
  onLogicChange,
  onChange,
  onRemove,
  onAdd,
  stages,
  members,
  labels,
  metaFields,
}: AutomationConditionBuilderProps) {
  return (
    <PipelineFormSection
      title={`Conditions${conditions.length > 0 ? ` (${conditions.length})` : ''}`}
      icon={Sparkles}
      description="Optional - only run when the conditions match."
    >
      {conditions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Match</span>
          <button
            type="button"
            onClick={() => onLogicChange('and')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
              conditionsLogic === 'and'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-slate-600 hover:border-indigo-300',
            )}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => onLogicChange('or')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
              conditionsLogic === 'or'
                ? 'bg-fuchsia-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-slate-600 hover:border-fuchsia-300',
            )}
          >
            ANY
          </button>
          <span className="text-xs text-slate-400">
            {conditionsLogic === 'and' ? 'all conditions must be true (AND)' : 'any condition being true matches (OR)'}
          </span>
        </div>
      )}

      {conditions.map((condition, index) => {
        const operators = operatorsForField(condition.field);
        return (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-100 bg-white p-2">
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Field</label>
              <select
                value={condition.field}
                onChange={(e) =>
                  onChange(index, { field: e.target.value as AutomationConditionField, value: undefined })
                }
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
                onChange={(e) => onChange(index, { operator: e.target.value as AutomationCondition['operator'] })}
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
                  onChange={(e) => onChange(index, { value: e.target.value ? Number(e.target.value) : null })}
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
                  onChange={(e) => onChange(index, { value: e.target.value })}
                  className={pipelineSelectClass}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : condition.field === 'priority' ? (
                <select
                  value={(condition.value as string) ?? 'medium'}
                  onChange={(e) => onChange(index, { value: e.target.value })}
                  className={pipelineSelectClass}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : condition.field === 'card_type' ? (
                <select
                  value={(condition.value as string) ?? 'lead'}
                  onChange={(e) => onChange(index, { value: e.target.value })}
                  className={pipelineSelectClass}
                >
                  {CARD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : condition.field === 'assigned_to' ? (
                <select
                  value={(condition.value as number) ?? ''}
                  onChange={(e) => onChange(index, { value: e.target.value ? Number(e.target.value) : null })}
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
                  onChange={(e) => onChange(index, { value: e.target.value ? Number(e.target.value) : null })}
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
                  onChange={(e) => onChange(index, { meta_field_id: e.target.value ? Number(e.target.value) : null })}
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
                  onChange={(e) => onChange(index, { value: e.target.value })}
                  placeholder="Value"
                  className={pipelineInputClass}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="mb-1 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
              title="Remove condition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add condition
      </Button>
    </PipelineFormSection>
  );
}