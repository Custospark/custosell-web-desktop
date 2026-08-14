import { Activity, BarChart3, CalendarDays, Columns3, FileText, Layers, Type } from 'lucide-react';
import type {
  BoardProgressContext,
  BoardProgressStage,
  DecompositionMode,
  PlanningLevel,
} from '../api/boardProgressTypes';
import { PLANNING_LEVEL_OPTIONS, metricUnitForKey } from '../api/pipelineProgressTerms';
import {
  targetValueIconForUnit,
  unitLabel,
  unitSuffix,
  type BoardTargetFormState,
} from './boardTargetFormHelpers';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';
import { cn } from '../../../shared/utils/cn';

interface BoardTargetCoreFieldsProps {
  form: BoardTargetFormState;
  context: BoardProgressContext;
  stages: BoardProgressStage[];
  metrics: { value: string; label: string }[];
  titlePlaceholder: string;
  onChange: (patch: Partial<BoardTargetFormState>) => void;
}

export function BoardTargetCoreFields({
  form,
  context,
  stages,
  metrics,
  titlePlaceholder,
  onChange,
}: BoardTargetCoreFieldsProps) {
  const metricUnit = metricUnitForKey(form.metric_key);

  return (
    <>
      <PipelineFormSection
        title="Planning horizon"
        icon={CalendarDays}
        description="How far this target spans. A Decade plan covers this year plus the next nine - expectations split across 2026, 2027, … and down to months/weeks."
      >
        <PipelineIconField label="Planning level" icon={Layers} required>
          <select
            value={form.planning_level}
            onChange={(e) => onChange({ planning_level: e.target.value as PlanningLevel })}
            className={pipelineSelectClass}
            aria-label="Planning level"
          >
            {PLANNING_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </PipelineIconField>
        <PipelineIconField label="Decomposition mode" icon={BarChart3} hint="Hybrid uses column velocity when available.">
          <select
            value={form.decomposition_mode}
            onChange={(e) => onChange({ decomposition_mode: e.target.value as DecompositionMode })}
            className={pipelineSelectClass}
            aria-label="Decomposition mode"
          >
            <option value="hybrid">Hybrid (velocity-weighted)</option>
            <option value="velocity">Velocity only</option>
            <option value="equal">Equal split</option>
          </select>
        </PipelineIconField>
      </PipelineFormSection>

      <PipelineFormSection
        title="Board column"
        icon={Columns3}
        description="Every target must track at least one Kanban column."
      >
        {stages.length === 0 ? (
          <p className="text-sm text-amber-700">Add columns to this board before creating targets.</p>
        ) : (
          <PipelineIconField label="Column" icon={Columns3} required>
            <select
              value={form.stage_id}
              onChange={(e) =>
                onChange({ stage_id: e.target.value ? Number(e.target.value) : '' })
              }
              className={pipelineSelectClass}
              aria-label="Board column"
            >
              <option value="">Select column…</option>
              {stages.map((stage) => (
                <option key={stage.stage_id} value={stage.stage_id}>
                  {stage.stage_name}
                  {stage.is_won ? ' (won)' : ''}
                  {stage.is_lost ? ' (lost)' : ''}
                </option>
              ))}
            </select>
          </PipelineIconField>
        )}
      </PipelineFormSection>

      <PipelineFormSection
        title="What you're aiming for"
        icon={Type}
        description="Give the target a clear name and optional context for the team."
      >
        <PipelineIconField label="Title" icon={Type} required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={pipelineInputClass}
            placeholder={titlePlaceholder}
          />
        </PipelineIconField>

        <PipelineIconField label="Description" icon={FileText} hint="Optional - helps everyone understand why this target matters.">
          <textarea
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
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
            onChange={(e) => onChange({ metric_key: e.target.value })}
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
          <PipelineIconField
            label={`Target ${unitLabel(metricUnit).toLowerCase()}`}
            icon={targetValueIconForUnit(metricUnit)}
            required
          >
            <input
              type="number"
              min={0}
              step="any"
              value={form.target_value}
              onChange={(e) => onChange({ target_value: e.target.value })}
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
                  <span className="ml-1 font-normal text-gray-500">
                    ({unitSuffix(metricUnit, context.currency)})
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </PipelineFormSection>
    </>
  );
}
