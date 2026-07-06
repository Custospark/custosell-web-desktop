import type { LucideIcon } from 'lucide-react';

const cardStyles: Record<string, {
  border: string;
  shadow: string;
  iconBg: string;
  iconColor: string;
  badge: string;
  glow: string;
  hoverBg: string;
}> = {
  blue: { border: 'border-blue-500', shadow: 'hover:shadow-blue-500/20', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-200' },
  green: { border: 'border-green-500', shadow: 'hover:shadow-green-500/20', iconBg: 'bg-green-100', iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700', glow: 'bg-green-500/10', hoverBg: 'group-hover:bg-green-200' },
  amber: { border: 'border-amber-500', shadow: 'hover:shadow-amber-500/20', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'bg-amber-500/10', hoverBg: 'group-hover:bg-amber-200' },
  purple: { border: 'border-purple-500', shadow: 'hover:shadow-purple-500/20', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', glow: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-200' },
  indigo: { border: 'border-indigo-500', shadow: 'hover:shadow-indigo-500/20', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', glow: 'bg-indigo-500/10', hoverBg: 'group-hover:bg-indigo-200' },
  rose: { border: 'border-rose-500', shadow: 'hover:shadow-rose-500/20', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', glow: 'bg-rose-500/10', hoverBg: 'group-hover:bg-rose-200' },
};

interface PipelineInsightStatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: keyof typeof cardStyles;
  badge: string;
  progress?: number;
}

export default function PipelineInsightStatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  badge,
  progress,
}: PipelineInsightStatCardProps) {
  const s = cardStyles[color];

  return (
    <div
      className={`group relative flex min-h-[130px] cursor-default flex-col justify-center overflow-hidden rounded-xl border-2 bg-gradient-to-br from-white to-white p-6 transition-all duration-300 hover:-translate-y-0.5 ${s.border} ${s.shadow}`}
    >
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${s.glow}`} />
      <div className="relative mb-4 flex items-center justify-between">
        <div className={`rounded-xl p-3.5 transition-all duration-300 ${s.iconBg} group-hover:scale-110 ${s.hoverBg}`}>
          <Icon className={`h-6 w-6 ${s.iconColor}`} />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}>{badge}</span>
      </div>
      <p className="relative mb-0.5 truncate text-3xl font-bold text-gray-900">{value}</p>
      <p className="relative text-sm font-medium text-gray-500">{label}</p>
      {sub && <p className="relative mt-1 text-xs text-gray-400">{sub}</p>}
      {progress !== undefined && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}
