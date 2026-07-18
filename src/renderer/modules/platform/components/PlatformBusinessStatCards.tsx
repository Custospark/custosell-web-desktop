import { Building2, Ban, TrendingUp, Calendar, DollarSign, Receipt, AlertTriangle, Mail } from 'lucide-react';
import type { PlatformBusinessStats } from '../api/PlatformTypes';

const cardStyles = {
  blue: { border: 'border-blue-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  green: { border: 'border-green-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  amber: { border: 'border-amber-500', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  red: { border: 'border-red-500', iconBg: 'bg-red-100', iconColor: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  indigo: { border: 'border-indigo-500', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
};

export function PlatformBusinessStatCards({ stats }: { stats: PlatformBusinessStats }) {
  const cards = [
    { label: 'Joined Today', value: String(stats.onboarding.today), hint: 'Prioritize welcome onboarding', icon: Calendar, color: 'blue' as const },
    { label: 'Joined This Week', value: String(stats.onboarding.this_week), hint: 'Weekly acquisition pace', icon: TrendingUp, color: 'green' as const },
    { label: 'Joined This Month', value: String(stats.onboarding.this_month), hint: 'Monthly growth signal', icon: Building2, color: 'indigo' as const },
    { label: 'In Selected Range', value: String(stats.onboarding.in_range), hint: `${stats.onboarding.range_from} → ${stats.onboarding.range_to}`, icon: Calendar, color: 'amber' as const },
    { label: 'Selling (30d)', value: String(stats.totals.with_gross_sales_30d), hint: 'Businesses with sale transactions', icon: DollarSign, color: 'green' as const },
    { label: 'Sales Tx (30d)', value: stats.totals.transactions_30d.toLocaleString(), hint: 'Platform-wide sale count from sales table', icon: Receipt, color: 'blue' as const },
    { label: 'Warnings', value: String(stats.totals.warning ?? 0), hint: 'Account warnings issued', icon: AlertTriangle, color: 'amber' as const },
    { label: 'Notified', value: String(stats.totals.notified ?? 0), hint: 'Marked after platform notification', icon: Mail, color: 'blue' as const },
    { label: 'Suspended', value: String(stats.totals.suspended), hint: 'Blocked from sign-in', icon: Ban, color: 'red' as const },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
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
  );
}
