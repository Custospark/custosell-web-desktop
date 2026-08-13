import { useState } from 'react';
import { usePlatformConversions } from './api/PlatformQueries';
import { ConversionMonthlyTrendChart, ConversionYearlyDistributionChart } from './PlatformConversionCharts';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { FlaskConical, CheckCircle2, TrendingUp, Users, Clock, Ban } from 'lucide-react';
import type { PlatformConversionByPlan } from './api/PlatformTypes';

const cardStyles = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  red: { border: 'border-red-500', shadow: 'hover:shadow-red-500/20', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
};

const RANGE_PRESETS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const;

function rangeParams(days: number): Record<string, string> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return {
    date_from: from.toISOString().slice(0, 10),
    date_to: to.toISOString().slice(0, 10),
  };
}

function statCard(label: string, value: string, icon: typeof FlaskConical, color: keyof typeof cardStyles, badge: string, note?: string) {
  const Icon = icon;
  const s = cardStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-white ${s.border} ${s.shadow} hover:-translate-y-0.5 group min-h-[130px] flex flex-col justify-center`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-${s.iconColor} opacity-10`} />
      <div className="flex items-center justify-between mb-4 relative">
        <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110`}>
          <Icon className={`w-6 h-6 ${s.iconColor}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>{badge}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{value}</p>
      <p className="text-sm font-medium text-gray-500 relative">{label}</p>
      {note && <p className="text-xs text-gray-400 mt-1 relative">{note}</p>}
    </div>
  );
}

function byPlanRate(plan: PlatformConversionByPlan): string {
  return `${plan.conversion_rate}%`;
}

function ConversionByPlanTable({ data }: { data: PlatformConversionByPlan[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Conversion by Plan</h3>
        <p className="text-sm text-gray-400 text-center py-8">No trial data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Conversion by Plan</h3>
      <p className="text-xs text-gray-500 mb-4">Trials started vs converted per plan in the selected range</p>
      <div className="space-y-3">
        {data.map((plan) => {
          const pct = plan.trials_started > 0 ? (plan.converted / plan.trials_started) * 100 : 0;
          return (
            <div key={plan.plan_slug} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">{plan.plan_name}</span>
                <span className="text-sm font-semibold text-gray-900">{byPlanRate(plan)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">{plan.converted} of {plan.trials_started} converted</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisionNotes({ decisions }: { decisions: string[] }) {
  if (decisions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
        Conversion Insights
      </h3>
      <ul className="space-y-2">
        {decisions.map((decision, i) => (
          <li key={i} className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">
            {decision}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PlatformConversionsPage() {
  const [days, setDays] = useState<number>(30);
  const params = rangeParams(days);
  const { data, isLoading } = usePlatformConversions(params);

  if (isLoading || !data) return <LoadingSkeleton variant="table" />;

  const summary = data.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversions</h1>
          <p className="text-sm text-gray-500 mt-1">Trial → paid conversion across the platform · {summary.range_from} to {summary.range_to}</p>
        </div>
        <div className="flex gap-2">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => setDays(preset.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === preset.days ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCard('Trials started (range)', String(summary.trials_started.in_range), FlaskConical, 'blue', 'New trials')}
        {statCard('Converted (range)', String(summary.converted.in_range), CheckCircle2, 'green', 'Paid')}
        {statCard('Conversion rate', `${summary.conversion_rate}%`, TrendingUp, 'amber', 'Rate')}
        {statCard('Active now', String(summary.status_now.active), Users, 'green', 'Active')}
        {statCard('On trial now', String(summary.status_now.on_trial), Clock, 'indigo', 'Trials')}
        {statCard('Churned / suspended', String(summary.status_now.cancelled + summary.status_now.suspended), Ban, 'red', 'Churned', 'Past due: ' + summary.status_now.past_due)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionMonthlyTrendChart data={data.monthly} />
        <ConversionYearlyDistributionChart data={data.monthly} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionByPlanTable data={data.by_plan} />
        <DecisionNotes decisions={data.decisions} />
      </div>
    </div>
  );
}
