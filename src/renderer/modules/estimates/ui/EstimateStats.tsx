import type { Estimate } from '../api/estimateTypes';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { DollarSign, Percent, Target, TrendingUp } from 'lucide-react';
import { cardStyles, toNumber, type StatColor } from './estimateStatHelpers';

export function MiniStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatColor;
}) {
  const s = cardStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-white p-4 ${s.border}`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-xl ${s.glow}`} />
      <div className="relative flex items-start gap-3">
        <div className={`shrink-0 rounded-lg p-2 ${s.iconBg}`}>
          <Icon className={`h-4 w-4 ${s.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function EstimateStats({ estimate }: { estimate: Estimate }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MiniStat label="Total" value={formatCurrency(toNumber(estimate.total), estimate.currency)} icon={DollarSign} color="blue" />
      <MiniStat label="Cost" value={formatCurrency(toNumber(estimate.cost_subtotal), estimate.currency)} icon={TrendingUp} color="amber" />
      <MiniStat label="Gross profit" value={formatCurrency(toNumber(estimate.gross_profit), estimate.currency)} icon={Target} color="green" />
      <MiniStat label="Margin" value={`${toNumber(estimate.margin_percent).toFixed(1)}%`} icon={Percent} color="purple" />
    </div>
  );
}
