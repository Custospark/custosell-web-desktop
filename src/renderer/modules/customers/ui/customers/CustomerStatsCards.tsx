import { Users, UserCheck, Award, DollarSign } from 'lucide-react';
import type { Customer } from '../../api/customers/CustomerTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';

interface Props {
  customers: Customer[];
}

const cardStyles: Record<string, { border: string; shadow: string; iconBg: string; iconColor: string; badge: string; glow: string; hoverBg: string }> = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
};

export function CustomerStatsCards({ customers }: Props) {
  const total = customers.length;
  const active = customers.filter((c) => c.last_purchase_at).length;
  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.total_purchases), 0);
  const topSpender = customers.reduce<Customer | null>((best, c) =>
    !best || parseFloat(c.total_purchases) > parseFloat(best.total_purchases) ? c : best, null);

  const cards = [
    { label: 'Total Customers', value: total.toLocaleString(), sub: 'All registered customers', icon: Users, color: 'blue', badge: 'Total' },
    { label: 'Active Customers', value: active.toLocaleString(), sub: `${total > 0 ? Math.round((active / total) * 100) : 0}% have made purchases`, icon: UserCheck, color: 'green', badge: 'Active', progress: total > 0 ? (active / total) * 100 : 0 },
    { label: 'Top Spender', value: topSpender ? topSpender.name : '-', sub: topSpender ? formatCurrency(topSpender.total_purchases) : 'No purchases yet', icon: Award, color: 'amber', badge: 'Top' },
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), sub: 'Revenue from customer purchases', icon: DollarSign, color: 'purple', badge: 'Revenue' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const s = cardStyles[card.color];
        return (
          <div key={card.label}
            className={`relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white to-${card.color}-50/50 ${s.border} ${s.shadow} hover:-translate-y-0.5 group cursor-default min-h-[130px] flex flex-col justify-center`}>
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
            <div className="flex items-center justify-between mb-4 relative">
              <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
                <Icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>{card.badge}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-0.5 relative truncate">{card.value}</p>
            <p className="text-sm font-medium text-gray-500 relative">{card.label}</p>
            {card.progress !== undefined && (
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
