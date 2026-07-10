import { cn } from '../../../shared/utils/cn';

interface DocumentProgressBarProps {
  percent: number;
  label?: string;
  className?: string;
}

export function DocumentProgressBar({ percent, label, className }: DocumentProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
          <span className="truncate">{label}</span>
          <span className="shrink-0 font-medium">{clamped}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
