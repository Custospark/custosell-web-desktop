import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { UserIdentityChip } from '../../../shared/components/UserIdentityChip';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { cn } from '../../../shared/utils/cn';
import type { BoardProgressContext, BoardProgressMember, BoardProgressSummary } from '../api/boardProgressTypes';
import { ProgressPanel, EmptyChart } from './BoardProgressShared';
import { capitalize } from './boardProgressUiHelpers';
import { PROGRESS_SURFACE } from './progressSurface';
import { TrendingUp, Users } from 'lucide-react';

interface BoardProgressChartsTablesProps {
  ctx: BoardProgressContext;
  trendData: Array<Record<string, unknown>>;
  funnelData: Array<{ stage_id: number; stage_name: string; display: number; fill: string }>;
  funnelMode: 'count' | 'value';
  onFunnelModeChange: (mode: 'count' | 'value') => void;
  members: BoardProgressMember[];
  columnMetrics: NonNullable<BoardProgressSummary['column_metrics']>;
}

export default function BoardProgressChartsTables({
  ctx,
  trendData,
  funnelData,
  funnelMode,
  onFunnelModeChange,
  members,
  columnMetrics,
}: BoardProgressChartsTablesProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <ProgressPanel
          title={`${capitalize(ctx.item_plural)} over time`}
          subtitle={`Created, ${ctx.won_label}, and ${ctx.lost_label} by day`}
          glassy
        >
          {trendData.length === 0 ? (
            <EmptyChart message={`No ${ctx.item_plural} activity in this period yet.`} />
          ) : (
            <div className={PROGRESS_SURFACE.chartWell}>
              <ChartContainer className="h-72">
                {({ width, height }) => (
                  <LineChart width={width} height={height} data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.88)',
                        border: '1px solid rgba(255,255,255,0.7)',
                        borderRadius: 12,
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="cards_created" name="Created" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="cards_won" name={capitalize(ctx.won_label)} stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="cards_lost" name={capitalize(ctx.lost_label)} stroke="#ef4444" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="expected" name="Expected pace" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                )}
              </ChartContainer>
            </div>
          )}
        </ProgressPanel>

        <ProgressPanel title="Stage funnel" subtitle={`Where ${ctx.item_plural} sit on selected columns`} glassy>
          <div className="mb-3 inline-flex rounded-lg border border-gray-200 p-0.5">
            <button type="button" onClick={() => onFunnelModeChange('count')} className={cn('rounded-md px-2 py-1 text-xs', funnelMode === 'count' ? 'bg-violet-600 text-white' : 'text-gray-600')}>Count</button>
            <button type="button" onClick={() => onFunnelModeChange('value')} className={cn('rounded-md px-2 py-1 text-xs', funnelMode === 'value' ? 'bg-violet-600 text-white' : 'text-gray-600')}>Value</button>
          </div>
          {funnelData.length === 0 ? (
            <EmptyChart message="No stage data yet." />
          ) : (
            <div className={PROGRESS_SURFACE.chartWell}>
              <ChartContainer className="h-72">
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.45} />
                    <XAxis dataKey="stage_name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255,255,255,0.88)',
                        border: '1px solid rgba(255,255,255,0.7)',
                        borderRadius: 12,
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      }}
                    />
                    <Bar dataKey="display" name={funnelMode === 'value' ? 'Value' : 'Count'} radius={[6, 6, 0, 0]} fillOpacity={0.92}>
                      {funnelData.map((entry) => (
                        <Cell key={entry.stage_id} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          )}
        </ProgressPanel>
      </div>

      <ProgressPanel
        title="Team performance"
        subtitle={`Individual contribution on this ${ctx.is_project_board ? 'project board' : ctx.is_pipeline_board ? 'pipeline board' : 'board'}`}
        icon={Users}
      >
        {members.length === 0 ? (
          <EmptyChart message="No member activity in this period yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">{capitalize(ctx.won_label)}</th>
                  <th className="px-3 py-2">{capitalize(ctx.lost_label)}</th>
                  <th className="px-3 py-2">Open</th>
                  <th className="px-3 py-2">Value {ctx.won_label}</th>
                  <th className="px-3 py-2">Comments</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900"><UserIdentityChip name={member.name} avatar={member.avatar} size="xs" /></td>
                    <td className="px-3 py-2">{member.metrics.cards_created ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_won ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_lost ?? 0}</td>
                    <td className="px-3 py-2">{member.metrics.cards_open ?? 0}</td>
                    <td className="px-3 py-2">{formatCurrency(member.metrics.pipeline_value_won ?? 0, ctx.currency)}</td>
                    <td className="px-3 py-2">{member.metrics.comments_posted ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProgressPanel>

      {columnMetrics.length > 0 && (
        <ProgressPanel title="Column metrics" subtitle="Throughput and dwell time for selected columns" icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Count</th>
                  <th className="px-3 py-2">Throughput</th>
                  <th className="px-3 py-2">Avg dwell</th>
                  <th className="px-3 py-2">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {columnMetrics.map((row) => (
                  <tr key={row.stage_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: row.color ?? '#8b5cf6' }} />
                      {row.stage_name}
                    </td>
                    <td className="px-3 py-2">{row.metrics.count ?? 0}</td>
                    <td className="px-3 py-2">{row.metrics.throughput ?? 0}</td>
                    <td className="px-3 py-2">{row.metrics.avg_dwell_days ?? 0}d</td>
                    <td className="px-3 py-2">{row.metrics.overdue ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProgressPanel>
      )}


    </>
  );
}
