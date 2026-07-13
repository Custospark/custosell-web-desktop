import type { ElementType } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { BusinessModuleSlug } from '../../../shared/utils/moduleAccess';

export interface OwnerModuleTileProps {
  slug: BusinessModuleSlug;
  label: string;
  description: string;
  icon: ElementType;
  tone: string;
  checked: boolean;
  locked?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function OwnerModuleTile({
  label,
  description,
  icon: Icon,
  tone,
  checked,
  locked = false,
  disabled = false,
  onToggle,
}: OwnerModuleTileProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!locked && !disabled) onToggle();
      }}
      disabled={locked || disabled}
      aria-pressed={checked}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        checked
          ? 'border-blue-200 bg-gradient-to-br from-blue-50/90 to-white shadow-sm shadow-blue-100/60'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80',
        locked && 'cursor-not-allowed opacity-90',
        !locked && !disabled && 'cursor-pointer active:scale-[0.99]',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
          tone,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Lock className="h-2.5 w-2.5" />
              Required
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
      <span
        className={cn(
          'mt-1 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors',
          checked ? 'bg-blue-600' : 'bg-slate-200',
          locked && 'opacity-70',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}
