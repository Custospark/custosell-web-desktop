import { Crosshair } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BoardTargetType } from '../api/boardProgressTypes';
import { PipelineFormSection } from './pipelineFormFields';
import { TARGET_TYPE_OPTIONS } from './boardTargetFormHelpers';

interface BoardTargetTypeSectionProps {
  type: BoardTargetType;
  onTypeChange: (type: 'kpi' | 'goal' | 'objective') => void;
}

export function BoardTargetTypeSection({ type, onTypeChange }: BoardTargetTypeSectionProps) {
  return (
    <PipelineFormSection
      title="Target type"
      icon={Crosshair}
      description="Choose how this target should be tracked on the board."
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {TARGET_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = type === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTypeChange(option.value)}
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
      {type === 'objective' && (
        <p className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-xs text-violet-800">
          Objectives roll up progress from the key results you add in the last section.
        </p>
      )}
    </PipelineFormSection>
  );
}
