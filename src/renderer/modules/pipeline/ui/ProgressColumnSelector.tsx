import { Columns3 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressContext, BoardProgressStage } from '../api/boardProgressTypes';
import { progressColumnsHint, progressColumnsTitle, PROGRESS_SURFACE } from './progressSurface';

interface ProgressColumnSelectorProps {
  stages: BoardProgressStage[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  context: BoardProgressContext;
  required?: boolean;
  className?: string;
  embedded?: boolean;
}

export default function ProgressColumnSelector({
  stages,
  selectedIds,
  onChange,
  context,
  required = true,
  className,
  embedded = false,
}: ProgressColumnSelectorProps) {
  const allSelected = stages.length > 0 && selectedIds.length === stages.length;

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((s) => s !== id);
      if (required && next.length === 0) return;
      onChange(next);
      return;
    }
    onChange([...selectedIds, id]);
  };

  const toggleAll = () => {
    if (allSelected && !required) {
      onChange([]);
      return;
    }
    onChange(stages.map((s) => s.stage_id));
  };

  if (stages.length === 0) {
    return (
      <p className={cn('text-sm text-amber-800', embedded ? '' : PROGRESS_SURFACE.panel)}>
        Add columns to this board before tracking column metrics.
      </p>
    );
  }

  return (
    <div
      className={cn(
        embedded ? 'pt-4' : PROGRESS_SURFACE.panel,
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Columns3 className="h-4 w-4 text-violet-600" />
          <div>
            <p className={cn('text-sm font-semibold', PROGRESS_SURFACE.textTitle)}>
              {progressColumnsTitle(context)}
            </p>
            <p className={cn('text-xs', PROGRESS_SURFACE.textMuted)}>
              {required ? progressColumnsHint(context) : 'Filter charts by column.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium text-violet-700 hover:text-violet-900"
        >
          {allSelected ? (required ? 'All selected' : 'Clear all') : 'Select all'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {stages.map((stage) => {
          const selected = selectedIds.includes(stage.stage_id);
          return (
            <button
              key={stage.stage_id}
              type="button"
              onClick={() => toggle(stage.stage_id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors backdrop-blur-sm',
                selected
                  ? 'border-violet-500/80 bg-white/95 text-violet-900 shadow-sm'
                  : 'border-white/50 bg-white/70 text-slate-700 hover:border-violet-300/80 hover:bg-white/90',
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: stage.color ?? '#8b5cf6' }}
              />
              {stage.stage_name}
              {stage.is_won && <span className="text-emerald-600">✓</span>}
              {stage.is_lost && <span className="text-red-500">✕</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
