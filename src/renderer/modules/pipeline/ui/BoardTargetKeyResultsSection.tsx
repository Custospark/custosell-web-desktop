import { Activity, Hash, Plus, Target, Trash2, Type } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { metricUnitForKey } from '../api/pipelineProgressTerms';
import {
  emptyKeyResult,
  unitLabel,
  type KeyResultDraft,
} from './boardTargetFormHelpers';
import {
  PipelineFormSection,
  PipelineIconField,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';

interface BoardTargetKeyResultsSectionProps {
  keyResults: KeyResultDraft[];
  metrics: { value: string; label: string }[];
  onChange: (next: KeyResultDraft[]) => void;
}

export function BoardTargetKeyResultsSection({
  keyResults,
  metrics,
  onChange,
}: BoardTargetKeyResultsSectionProps) {
  return (
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
                    onClick={() => onChange(keyResults.filter((_, i) => i !== index))}
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
                      onChange(
                        keyResults.map((item, i) =>
                          i === index ? { ...item, title: e.target.value } : item,
                        ),
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
                        onChange(
                          keyResults.map((item, i) =>
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
                        onChange(
                          keyResults.map((item, i) =>
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
        onClick={() => onChange([...keyResults, emptyKeyResult()])}
      >
        <Plus className="h-4 w-4" />
        Add key result
      </Button>
    </PipelineFormSection>
  );
}
