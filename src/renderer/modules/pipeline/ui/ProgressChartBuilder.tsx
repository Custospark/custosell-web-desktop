import { useEffect, useState } from 'react';
import { LayoutGrid, Save } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import type { BoardProgressContext, BoardProgressStage, ProgressChartConfig } from '../api/boardProgressTypes';
import { METRIC_LABELS, PROGRESS_METRIC_KEYS } from '../api/pipelineProgressTerms';
import { useBoardProgressConfig, useSaveBoardProgressConfig } from '../api/useBoardProgressQueries';
import { cn } from '../../../shared/utils/cn';
import { PROGRESS_SURFACE } from './progressSurface';

interface ProgressChartBuilderProps {
  boardId: number;
  context: BoardProgressContext;
  stages: BoardProgressStage[];
  selectedStageIds: number[];
  canManage?: boolean;
}

const CHART_TYPES = [
  { value: 'line' as const, label: 'Line' },
  { value: 'bar' as const, label: 'Bar' },
  { value: 'stacked' as const, label: 'Stacked' },
];

const defaultConfig = (stageIds: number[]): ProgressChartConfig => ({
  charts: [
    {
      id: 'trend-primary',
      type: 'line',
      metrics: ['cards_created', 'cards_won'],
      stage_ids: stageIds,
    },
  ],
  funnel_mode: 'count',
});

export default function ProgressChartBuilder({
  boardId,
  context,
  stages,
  selectedStageIds,
  canManage,
}: ProgressChartBuilderProps) {
  const { data: savedConfig } = useBoardProgressConfig(boardId, canManage ?? false);
  const saveConfig = useSaveBoardProgressConfig(boardId);
  const [draft, setDraft] = useState<ProgressChartConfig>(defaultConfig(selectedStageIds));

  useEffect(() => {
    if (savedConfig) {
      setDraft(savedConfig);
      return;
    }
    setDraft(defaultConfig(selectedStageIds));
  }, [savedConfig, selectedStageIds]);

  if (!canManage) return null;

  const chart = draft.charts[0] ?? defaultConfig(selectedStageIds).charts[0];

  return (
    <div className={PROGRESS_SURFACE.panel}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-violet-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Chart layout</p>
            <p className="text-xs text-gray-500">Configure which metrics appear on your progress charts.</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="inline-flex items-center gap-2"
          onClick={() => saveConfig.mutate(draft)}
          loading={saveConfig.isPending}
        >
          <Save className="h-3.5 w-3.5" />
          Save layout
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-gray-600">
          Chart type
          <select
            value={chart.type}
            onChange={(e) => {
              const type = e.target.value as ProgressChartConfig['charts'][0]['type'];
              setDraft((prev) => ({
                ...prev,
                charts: [{ ...chart, type }],
              }));
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            {CHART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-600 md:col-span-2">
          Primary metric
          <select
            value={chart.metric ?? chart.metrics?.[0] ?? 'cards_won'}
            onChange={(e) => {
              const metric = e.target.value;
              setDraft((prev) => ({
                ...prev,
                charts: [{ ...chart, metric, metrics: [metric, ...(chart.metrics ?? []).slice(1)] }],
              }));
            }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            {PROGRESS_METRIC_KEYS.map((key) => (
              <option key={key} value={key}>{METRIC_LABELS[key]?.(context) ?? key}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-gray-600">Columns in chart scope</p>
        <div className="flex flex-wrap gap-2">
          {stages.map((stage) => {
            const active = chart.stage_ids.includes(stage.stage_id);
            return (
              <button
                key={stage.stage_id}
                type="button"
                onClick={() => {
                  const nextIds = active
                    ? chart.stage_ids.filter((id) => id !== stage.stage_id)
                    : [...chart.stage_ids, stage.stage_id];
                  if (nextIds.length === 0) return;
                  setDraft((prev) => ({
                    ...prev,
                    charts: [{ ...chart, stage_ids: nextIds }],
                  }));
                }}
                className={cn(
                  'rounded-lg border px-2 py-1 text-xs',
                  active ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-gray-200 text-gray-600',
                )}
              >
                {stage.stage_name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
