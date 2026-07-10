import { cn } from '../../../shared/utils/cn';

interface DocumentActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export function DocumentActionButton({
  icon,
  label,
  description,
  onClick,
  disabled = false,
  danger = false,
  className,
}: DocumentActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        'hover:border-indigo-300 hover:bg-indigo-50/60 disabled:cursor-not-allowed disabled:opacity-50',
        danger ? 'border-red-100 bg-red-50/40 hover:border-red-200 hover:bg-red-50' : 'border-gray-200 bg-white',
        className,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          danger ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', danger ? 'text-red-700' : 'text-gray-900')}>{label}</span>
        {description && <span className="mt-0.5 block text-xs text-gray-500">{description}</span>}
      </span>
    </button>
  );
}
