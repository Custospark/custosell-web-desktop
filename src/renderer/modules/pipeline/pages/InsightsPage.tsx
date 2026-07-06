import { useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { usePipelineBoards, usePipelineInsights } from '../api/usePipelineQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

export default function InsightsPage() {
  const { data: boards } = usePipelineBoards();
  const [boardId, setBoardId] = useState<number | undefined>(undefined);
  const { data: insights, isLoading } = usePipelineInsights(boardId);

  if (isLoading || !insights) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">Board</label>
        <select
          value={boardId ?? ''}
          onChange={(e) => setBoardId(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All accessible boards</option>
          {(boards ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Open leads</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{insights.open_leads}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pipeline value</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {formatCurrency(insights.open_pipeline_value, 'UGX')}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Won / Lost</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {insights.won_leads} / {insights.lost_leads}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Win rate</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">{insights.win_rate_percent}%</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Open leads by stage</h3>
        <div className="space-y-3">
          {insights.by_stage.length === 0 ? (
            <p className="text-sm text-gray-500">No open leads in the selected scope.</p>
          ) : (
            insights.by_stage.map((row) => (
              <div key={row.stage_id} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color ?? '#64748b' }} />
                <span className="min-w-[120px] text-sm text-gray-800">{row.stage_name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, (row.count / Math.max(insights.open_leads, 1)) * 100)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm text-gray-600">{row.count}</span>
                <span className="w-28 text-right text-sm text-gray-500">{formatCurrency(row.value, 'UGX')}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
