import { TrendingUp } from 'lucide-react';

interface SalesRepBadgeProps {
  rate?: string | null;
  type?: string | null;
}

export default function SalesRepBadge({ rate, type }: SalesRepBadgeProps) {
  const suffix = type === 'percentage' ? '%' : '';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" />
      Sales Rep{rate ? ` · ${rate}${suffix}` : ''}
    </span>
  );
}
