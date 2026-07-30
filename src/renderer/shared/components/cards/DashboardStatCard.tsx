import { type ElementType, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { CARD_COLORS, type CardColor } from './statCardStyles';

interface DashboardStatCardProps {
  label: string;
  value: string;
  icon: ElementType;
  color: CardColor;
  badge: string;
  sub?: ReactNode;
  className?: string;
}

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  color,
  badge,
  sub,
  className,
}: DashboardStatCardProps) {
  const s = CARD_COLORS[color];
  return (
    <div
      className={cn(
        `relative overflow-hidden rounded-xl p-6 transition-all duration-300 border-2 bg-gradient-to-br from-white ${s.gradient} ${s.border} ${s.shadow} hover:-translate-y-0.5 group min-h-[130px] flex flex-col justify-center`,
        className,
      )}
    >
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${s.glow}`} />
      <div className="flex items-center justify-between mb-4 relative">
        <div className={`p-3.5 rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
          <Icon className={`w-6 h-6 ${s.iconColor}`} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.badge}`}>
          {badge}
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-0.5 relative">{value}</p>
      <p className="text-sm font-medium text-gray-500 relative">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 relative">{sub}</p>}
    </div>
  );
}
