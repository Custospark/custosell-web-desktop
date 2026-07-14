import { BarChart3, CalendarDays, Columns3, Layers } from 'lucide-react';
import type { BoardProgressStage, DecompositionMode, PlanningLevel } from '../api/boardProgressTypes';
import { PLANNING_LEVEL_OPTIONS } from '../api/pipelineProgressTerms';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineSelectClass,
} from './pipelineFormFields';
import type { BoardTargetFormState } from './boardTargetFormHelpers';

interface BoardTargetPlanningSectionProps {
  form: BoardTargetFormState;
  stages: BoardProgressStage[];
  onFormChange: (patch: Partial<BoardTargetFormState>) => void;
}

export function BoardTargetPlanningSection({ form, stages, onFormChange }: BoardTargetPlanningSectionProps) {
  return (
    <>
      <PipelineFormSection
        title="Planning horizon"
        icon={CalendarDays}
        description="Choose how far this target spans — expectations decompose down to daily contributions."
      >
        <PipelineIconField label="Planning level" icon={Layers} required>
          <select
            value={form.planning_level}
            onChange={(e) => onFormChange({ planning_level: e.target.value as PlanningLevel })}
            className={pipelineSelectClass}
            aria-label="Planning level"
          >
            {PLANNING_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </PipelineIconField>
        <PipelineIconField label="Decomposition mode" icon={BarChart3} hint="Hybrid uses column velocity when available.">
          <select
            value={form.decomposition_mode}
            onChange={(e) => onFormChange({ decomposition_mode: e.target.value as DecompositionMode })}
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
                onFormChange({ stage_id: e.target.value ? Number(e.target.value) : '' })
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
    </>
  );
}
