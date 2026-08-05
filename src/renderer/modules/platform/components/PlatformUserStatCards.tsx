import {
  Users, UserX, TrendingUp, Calendar, Building2, LogIn, AlertTriangle, Mail, UserCog,
} from 'lucide-react';
import type { PlatformUserStats } from '../api/PlatformTypes';
import { PlatformUserGrowthChart } from '../PlatformCharts';

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  red: { border: 'border-red-500', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
  purple: { border: 'border-purple-500', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
};

interface PlatformUserStatCardsProps {
  stats: PlatformUserStats;
  rangeLabel: string;
}

export function PlatformUserStatCards({ stats, rangeLabel }: PlatformUserStatCardsProps) {
  const statCards = [
    { label: 'Joined Today', value: String(stats.onboarding.today), hint: 'Prioritize welcome onboarding', icon: Calendar, color: 'blue' as const },
    { label: 'Joined This Week', value: String(stats.onboarding.this_week), hint: 'Weekly acquisition pace', icon: TrendingUp, color: 'green' as const },
    { label: 'Joined This Month', value: String(stats.onboarding.this_month), hint: 'Monthly growth signal', icon: Users, color: 'purple' as const },
    { label: 'In Selected Range', value: String(stats.onboarding.in_range), hint: `${stats.onboarding.range_from} → ${stats.onboarding.range_to}`, icon: Calendar, color: 'indigo' as const },
    { label: 'With Business', value: String(stats.totals.with_business), hint: 'Linked to a tenant business', icon: Building2, color: 'green' as const },
    { label: 'Logins (30d)', value: (stats.totals.logins_30d ?? 0).toLocaleString(), hint: 'Users who signed in recently', icon: LogIn, color: 'blue' as const },
    { label: 'Warnings', value: String(stats.totals.warning ?? 0), hint: 'Account warnings issued', icon: AlertTriangle, color: 'amber' as const },
    { label: 'Notified', value: String(stats.totals.notified ?? 0), hint: 'Marked after platform notification', icon: Mail, color: 'blue' as const },
    { label: 'Deactivated', value: String(stats.totals.deactivated), hint: 'Blocked from sign-in', icon: UserX, color: 'red' as const },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const s = cardStyles[card.color];
          return (
            <div key={card.label} className={`rounded-xl p-5 border-2 bg-white ${s.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${s.iconBg}`}>
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{card.label}</p>
              <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PlatformUserGrowthChart data={stats.growth ?? []} rangeLabel={rangeLabel} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Decision Insights
          </h3>
          <ul className="space-y-3">
            {(stats.decisions ?? []).map((note) => (
              <li key={note} className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
          {stats.totals.platform_admins > 0 && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-3 flex items-center gap-2">
              <UserCog className="w-3.5 h-3.5 shrink-0" />
              {stats.totals.platform_admins} platform operator{stats.totals.platform_admins === 1 ? '' : 's'} in the loaded set
            </p>
          )}
        </div>
      </div>
    </>
  );
}
