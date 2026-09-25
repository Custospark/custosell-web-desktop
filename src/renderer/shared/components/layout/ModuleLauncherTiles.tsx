import { Check, LayoutGrid, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ModuleLauncherItem } from './moduleLauncherCatalog';
import { isOnlineOnlyLauncherSlug, launcherOfflineMessage } from './onlineOnlyNav';

export function SectionHeading({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof LayoutGrid;
  label: string;
  tone: 'indigo' | 'violet';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  return (
    <div className="flex items-center gap-2 px-0.5">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1', tones[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
    </div>
  );
}

export function CircularCheck({
  checked,
  locked,
  disabled,
}: {
  checked: boolean;
  locked?: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
        checked
          ? 'scale-105 border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-300'
          : 'border-slate-300 bg-white text-transparent',
        locked && 'scale-100 border-slate-300 bg-slate-100 shadow-none',
        disabled && 'opacity-60',
      )}
    >
      {locked ? (
        <Lock className="h-2.5 w-2.5 text-slate-400" />
      ) : (
        <Check className="h-3 w-3" strokeWidth={3} />
      )}
    </span>
  );
}

export function NavModuleTile({
  item,
  isActive,
  disabled,
  disabledReason,
  onSelect,
}: {
  item: ModuleLauncherItem;
  isActive: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      onClick={onSelect}
      className={cn(
        'group flex w-full items-center gap-2.5 overflow-hidden rounded-lg border bg-white px-2.5 py-2 text-left shadow-sm',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40',
        disabled
          ? 'cursor-not-allowed opacity-50 border-gray-200/90'
          : 'hover:border-indigo-200 hover:shadow',
        !disabled && isActive
          ? 'border-indigo-400 bg-indigo-50/80 ring-1 ring-indigo-300/60'
          : !disabled && 'border-gray-200/90',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1',
          item.tone,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(
          'block truncate text-sm font-medium',
          disabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-indigo-800',
        )}
        >
          {item.label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-gray-500">
          {disabled ? 'Requires connection' : item.description}
        </span>
      </span>
    </button>
  );
}

export function StoreModuleTile({
  item,
  checked,
  locked,
  disabled,
  changed,
  onToggle,
}: {
  item: ModuleLauncherItem;
  checked: boolean;
  locked?: boolean;
  disabled?: boolean;
  changed?: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        if (!locked && !disabled) onToggle();
      }}
      disabled={locked || disabled}
      aria-pressed={checked}
      title={locked ? 'Required - always on' : checked ? `Turn off ${item.label}` : `Turn on ${item.label}`}
      className={cn(
        'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border bg-white px-2.5 py-2 text-left shadow-sm',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
        checked
          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300/70 shadow-md shadow-blue-200/60'
          : 'border-gray-200/90 hover:border-blue-200 hover:shadow',
        changed && 'border-indigo-300 ring-2 ring-indigo-400/60',
        (locked || disabled) && 'cursor-not-allowed',
        !locked && !disabled && 'cursor-pointer active:scale-[0.99]',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1',
          item.tone,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">
          {item.label}
          {locked && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Required
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-gray-500">
          {item.description}
        </span>
      </span>
      <CircularCheck checked={checked} locked={locked} disabled={disabled} />
    </button>
  );
}

export function ModuleGrid({
  items,
  activeSlug,
  offline,
  onSelect,
}: {
  items: ModuleLauncherItem[];
  activeSlug: string | null;
  offline: boolean;
  onSelect: (item: ModuleLauncherItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const blocked = offline && isOnlineOnlyLauncherSlug(item.slug);
        return (
          <NavModuleTile
            key={item.slug}
            item={item}
            isActive={activeSlug === item.slug}
            disabled={blocked}
            disabledReason={blocked ? launcherOfflineMessage(item.slug) : undefined}
            onSelect={() => {
              if (!blocked) onSelect(item);
            }}
          />
        );
      })}
    </div>
  );
}

export function StoreModuleGrid({
  items,
  checkedSlugs,
  saving,
  changedSlugs,
  onToggle,
}: {
  items: ModuleLauncherItem[];
  checkedSlugs: Set<string>;
  saving: boolean;
  changedSlugs?: Set<string>;
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const slug = item.slug;
        const locked = slug === 'settings';
        const checked = locked || checkedSlugs.has(slug);
        return (
          <StoreModuleTile
            key={item.slug}
            item={item}
            checked={checked}
            locked={locked}
            disabled={saving}
            changed={changedSlugs?.has(slug) ?? false}
            onToggle={() => onToggle(slug)}
          />
        );
      })}
    </div>
  );
}
