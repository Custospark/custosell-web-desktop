import { Users, UserCheck, Award, DollarSign } from 'lucide-react';
import type { Customer } from '../../api/customers/CustomerTypes';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';

interface Props {
  customers: Customer[];
}

export function CustomerStatsCards({ customers }: Props) {
  const total = customers.length;
  const active = customers.filter((c) => c.last_purchase_at).length;
  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.total_purchases), 0);
  const topSpender = customers.reduce<Customer | null>((best, c) =>
    !best || parseFloat(c.total_purchases) > parseFloat(best.total_purchases) ? c : best, null);

  const cards = [
    {
      label: 'Total Customers',
      value: total.toLocaleString(),
      sub: 'All registered customers',
      icon: Users,
      color: 'blue',
      gradient: 'from-white to-blue-50/50',
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      iconBg: 'bg-blue-100 group-hover:bg-blue-200',
      iconColor: 'text-blue-600',
      badge: 'Total',
    },
    {
      label: 'Active Customers',
      value: active.toLocaleString(),
      sub: `${total > 0 ? Math.round((active / total) * 100) : 0}% have made purchases`,
      icon: UserCheck,
      color: 'green',
      gradient: 'from-white to-green-50/50',
      border: 'border-green-200',
      hoverBorder: 'hover:border-green-400',
      iconBg: 'bg-green-100 group-hover:bg-green-200',
      iconColor: 'text-green-600',
      badge: 'Active',
      progress: total > 0 ? (active / total) * 100 : 0,
    },
    {
      label: 'Top Spender',
      value: topSpender ? topSpender.name : '—',
      sub: topSpender ? formatCurrency(topSpender.total_purchases) : 'No purchases yet',
      icon: Award,
      color: 'yellow',
      gradient: 'from-white to-yellow-50/50',
      border: 'border-yellow-200',
      hoverBorder: 'hover:border-yellow-400',
      iconBg: 'bg-yellow-100 group-hover:bg-yellow-200',
      iconColor: 'text-yellow-600',
      badge: 'Top',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      sub: 'Revenue from customer purchases',
      icon: DollarSign,
      color: 'purple',
      gradient: 'from-white to-purple-50/50',
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-400',
      iconBg: 'bg-purple-100 group-hover:bg-purple-200',
      iconColor: 'text-purple-600',
      badge: 'Revenue',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 border-2 bg-gradient-to-br ${card.gradient} ${card.border} ${card.hoverBorder} group transform hover:-translate-y-1 hover:shadow-lg`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity bg-current" style={{ color: card.color === 'red' ? 'rgba(239,68,68,0.08)' : card.color === 'blue' ? 'rgba(59,130,246,0.08)' : card.color === 'green' ? 'rgba(34,197,94,0.08)' : card.color === 'yellow' ? 'rgba(234,179,8,0.08)' : 'rgba(168,85,247,0.08)' }} />

            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-xl transition-all duration-300 ${card.iconBg} group-hover:scale-110`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                card.color === 'red' ? 'bg-red-100 text-red-700' :
                card.color === 'green' ? 'bg-green-100 text-green-700' :
                card.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                card.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {card.badge}
              </span>
            </div>

            <p className="text-2xl font-bold text-gray-900 mb-0.5 truncate">{card.value}</p>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>

            {card.progress !== undefined && (
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
