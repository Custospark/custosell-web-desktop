import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { usePipelineBoards, usePipelineInsights } from '../api/usePipelineQueries';
import { useBusiness } from '../../settings/api/settings/BusinessQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import PipelineInsightStatCard from '../ui/PipelineInsightStatCard';
import { pipelineSelectClass } from '../ui/pipelineFormFields';
import {
  BarChart3, DollarSign, Filter, Target, TrendingUp, Trophy, Users, UserCheck, XCircle,
} from 'lucide-react';

function leadsLink(params: Record<string, string>) {
  const q = new URLSearchParams({ card_type: 'lead', ...params }).toString();
  return `${ROUTES.PIPELINE.LEADS}${q ? `?${q}` : ''}`;
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const { data: boards } = usePipelineBoards({ salesOnly: true });
  const { data: business } = useBusiness();
  const [boardId, setBoardId] = useState<number | undefined>(undefined);
  const { data: insights, isLoading, isError, refetch } = usePipelineInsights(boardId);

  const currency = business?.currency ?? 'UGX';
  const boardParam = boardId ? String(boardId) : '';

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <CustosellLoader />
      </div>
    );
  }

  if (isError || !insights) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="Could not load insights"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => refetch()}
      />
    );
  }

  const hasData = insights.open_leads > 0
    || insights.won_leads > 0
    || insights.lost_leads > 0
    || (insights.converted_leads ?? 0) > 0;

  const maxStageCount = Math.max(...insights.by_stage.map((r) => r.count), 1);
  const maxSourceCount = Math.max(...(insights.by_source ?? []).map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pipeline performance</h2>
          <p className="mt-1 text-sm text-gray-500">Sales leads only — project boards and task cards are excluded.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={boardId ?? ''}
            onChange={(e) => setBoardId(e.target.value ? Number(e.target.value) : undefined)}
            className={pipelineSelectClass}
          >
            <option value="">All sales boards</option>
            {(boards ?? []).filter((b) => !b.project_id).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
        <PipelineInsightStatCard
          label="Open leads"
          value={String(insights.open_leads)}
          sub="Currently in pipeline"
          icon={Users}
          color="blue"
          badge="Open"
        />
        <PipelineInsightStatCard
          label="Pipeline value"
          value={formatCurrency(insights.open_pipeline_value, currency)}
          sub="Estimated open deals"
          icon={DollarSign}
          color="green"
          badge="Value"
        />
        <PipelineInsightStatCard
          label="Won deals"
          value={String(insights.won_leads)}
          icon={Trophy}
          color="amber"
          badge="Won"
        />
        <PipelineInsightStatCard
          label="Lost deals"
          value={String(insights.lost_leads)}
          icon={XCircle}
          color="rose"
          badge="Lost"
        />
        <PipelineInsightStatCard
          label="Converted"
          value={String(insights.converted_leads ?? 0)}
          sub="Moved to customers"
          icon={UserCheck}
          color="purple"
          badge="CRM"
        />
        <PipelineInsightStatCard
          label="Win rate"
          value={`${insights.win_rate_percent}%`}
          sub={`${insights.won_leads} won of ${insights.won_leads + insights.lost_leads} closed`}
          icon={Target}
          color="indigo"
          badge="Rate"
          progress={insights.win_rate_percent}
        />
      </div>

      {!hasData ? (
        <Card className="py-14 text-center">
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No pipeline data yet"
            description="Add leads on a board to see stage distribution and source breakdowns here."
            actionLabel="Go to boards"
            onAction={() => navigate(ROUTES.PIPELINE.BOARDS)}
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Open leads by stage</h3>
              <Link
                to={leadsLink({ status: 'open', ...(boardParam ? { board_id: boardParam } : {}) })}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View all open
              </Link>
            </div>
            <div className="space-y-4">
              {insights.by_stage.length === 0 ? (
                <p className="text-sm text-gray-500">No open leads in the selected scope.</p>
              ) : (
                insights.by_stage.map((row) => (
                  <Link
                    key={row.stage_id}
                    to={leadsLink({
                      status: 'open',
                      ...(boardParam ? { board_id: boardParam } : {}),
                    })}
                    className="block rounded-lg p-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-800">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color ?? '#64748b' }}
                        />
                        {row.stage_name}
                      </span>
                      <span className="text-gray-500">{row.count} · {formatCurrency(row.value, currency)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(row.count / maxStageCount) * 100}%`,
                          backgroundColor: row.color ?? '#3b82f6',
                        }}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Open leads by source</h3>
              <Link
                to={leadsLink({ status: 'open', ...(boardParam ? { board_id: boardParam } : {}) })}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View leads
              </Link>
            </div>
            <div className="space-y-4">
              {(insights.by_source ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No source data for open leads.</p>
              ) : (
                (insights.by_source ?? []).map((row) => (
                  <div key={row.source_id ?? 'none'} className="rounded-lg p-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-gray-800">{row.source_name}</span>
                      <span className="text-gray-500">{row.count} · {formatCurrency(row.value, currency)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${(row.count / maxSourceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="border-dashed bg-gray-50/50 p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">Quick links:</span>
          {' '}
          <Link to={leadsLink({ status: 'won', ...(boardParam ? { board_id: boardParam } : {}) })} className="text-blue-600 hover:underline">Won leads</Link>
          {' · '}
          <Link to={leadsLink({ status: 'lost', ...(boardParam ? { board_id: boardParam } : {}) })} className="text-blue-600 hover:underline">Lost leads</Link>
          {' · '}
          <Link to={leadsLink({ status: 'converted', ...(boardParam ? { board_id: boardParam } : {}) })} className="text-blue-600 hover:underline">Converted</Link>
          {' · '}
          <Link to={ROUTES.PIPELINE.SETTINGS} className="text-blue-600 hover:underline">Pipeline settings</Link>
        </p>
      </Card>
    </div>
  );
}
