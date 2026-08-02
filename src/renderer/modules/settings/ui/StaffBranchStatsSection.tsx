import { useMemo } from 'react';
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowRightLeft, GitBranch, Users, Clock, CheckCircle2 } from 'lucide-react';
import { DashboardStatCard } from '../../../shared/components/cards/DashboardStatCard';
import type { CardColor } from '../../../shared/components/cards/statCardStyles';
import { ChartContainer } from '../../../shared/components/charts/ChartContainer';
import { CHART_THEME } from '../../../shared/components/charts/chartPrimitives';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import type { Location } from '../api/settings/LocationTypes';
import type { StaffTransfer } from '../api/settings/StaffTypes';
import { buildBranchStats, buildTransferSummary, PIE_COLORS } from './staffBranchStats';

interface StaffBranchStatsSectionProps {
  staff: StaffWithSyncMeta[] | undefined;
  locations: Location[] | undefined;
  transfers: StaffTransfer[] | undefined;
  isLoading?: boolean;
  onOpenTransfers?: () => void;
}

function BranchDonut({ data }: { data: ReturnType<typeof buildBranchStats> }) {
  const empty = data.length === 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Staff by Branch</h3>
      {empty ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          No staff yet
        </div>
      ) : (
        <>
          <ChartContainer className="h-64" minHeight={256}>
            {(size) => (
              <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val} staff`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
          <div className="space-y-1.5 mt-3">
            {data.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate text-gray-700">
                    {item.name}
                    {item.isDefault ? <span className="text-gray-400 ml-1">(Default)</span> : null}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 ml-2">{item.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BranchBars({ data }: { data: ReturnType<typeof buildBranchStats> }) {
  const empty = data.length === 0;
  const height = Math.max(288, data.length * 42 + 16);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Headcount by Branch</h3>
      {empty ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          No staff yet
        </div>
      ) : (
        <ChartContainer className="h-72" minHeight={height}>
          {(size) => (
            <ResponsiveContainer width={size.width} height={size.height} debounce={50}>
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={Math.min(160, Math.max(70, Math.max(...data.map((d) => d.name.length)) * 8 + 20))}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(val) => [`${val} staff`, 'Headcount']} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill={CHART_THEME.line} radius={[0, 4, 4, 0]} name="Headcount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      )}
    </div>
  );
}

export function StaffBranchStatsSection({
  staff,
  locations,
  transfers,
  isLoading = false,
  onOpenTransfers,
}: StaffBranchStatsSectionProps) {
  const branchStats = useMemo(() => buildBranchStats(staff, locations), [staff, locations]);
  const transferSummary = useMemo(() => buildTransferSummary(transfers), [transfers]);

  const totalStaff = (staff ?? []).filter(Boolean).length;
  const branchesUsed = branchStats.filter((b) => b.id != null).length;

  const cards: Array<{ label: string; value: string; icon: React.ElementType; color: CardColor; badge: string; sub: string }> = [
    {
      label: 'Total Staff',
      value: String(totalStaff),
      icon: Users,
      color: 'blue',
      badge: 'People',
      sub: `${branchesUsed} branch${branchesUsed === 1 ? '' : 'es'} in use`,
    },
    {
      label: 'Branches',
      value: String(branchesUsed),
      icon: GitBranch,
      color: 'purple',
      badge: 'Locations',
      sub: `${branchStats.length} group${branchStats.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Completed Transfers',
      value: String(transferSummary.completed),
      icon: CheckCircle2,
      color: 'green',
      badge: 'Done',
      sub: `${transferSummary.total} total`,
    },
    {
      label: 'Pending Transfers',
      value: String(transferSummary.pending),
      icon: Clock,
      color: 'amber',
      badge: 'Action',
      sub: transferSummary.pending > 0 ? 'Needs review' : 'All clear',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <DashboardStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={Icon}
              color={card.color}
              badge={card.badge}
              sub={card.sub}
            />
          );
        })}
      </div>

      {isLoading ? null : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BranchDonut data={branchStats} />
          <BranchBars data={branchStats} />
        </div>
      )}

      {onOpenTransfers && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Transfer history</p>
            <p className="text-xs text-gray-500 mt-0.5">Every branch move for your staff — completed, pending, and cancelled.</p>
          </div>
          <button
            type="button"
            onClick={onOpenTransfers}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            View transfers
          </button>
        </div>
      )}
    </div>
  );
}
