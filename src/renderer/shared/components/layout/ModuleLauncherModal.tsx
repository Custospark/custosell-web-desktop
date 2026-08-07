import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Search, Shield } from 'lucide-react';
import { Modal } from '../modals/Modal';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { resolveModuleForPath } from '../../utils/moduleAccess';
import { cn } from '../../utils/cn';
import {
  getLauncherModulesForUser,
  sortLauncherModules,
  type ModuleLauncherItem,
} from './moduleLauncherCatalog';
import { isOnlineOnlyLauncherSlug, launcherOfflineMessage } from './onlineOnlyNav';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { usePlanAccessibleModules } from '../../utils/usePlanAccessibleModules';

interface ModuleLauncherModalProps {
  open: boolean;
  onClose: () => void;
}

function SectionHeading({
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

function ModuleTile({
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

function ModuleGrid({
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const blocked = offline && isOnlineOnlyLauncherSlug(item.slug);
        return (
          <ModuleTile
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

export default function ModuleLauncherModal({ open, onClose }: ModuleLauncherModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const { isCompletelyOffline } = useNetworkStatus();
  const planModules = usePlanAccessibleModules();
  const [query, setQuery] = useState('');

  const accessible = useMemo(
    () => sortLauncherModules(
      getLauncherModulesForUser(user, planModules).map((item) =>
        item.slug === 'expenses' && user?.account_type !== 'personal'
          ? { ...item, label: 'Expenses' }
          : item,
      ),
    ),
    [user, planModules],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accessible;
    return accessible.filter(
      (item) =>
        item.label.toLowerCase().includes(q)
        || item.description.toLowerCase().includes(q)
        || item.slug.toLowerCase().includes(q),
    );
  }, [accessible, query]);

  const workspaceItems = useMemo(
    () => filtered.filter((item) => item.section === 'workspace'),
    [filtered],
  );
  const platformItems = useMemo(
    () => filtered.filter((item) => item.section === 'platform'),
    [filtered],
  );

  const activeSlug = resolveModuleForPath(location.pathname);
  const totalCount = filtered.length;
  const empty = totalCount === 0;

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSelect = (item: ModuleLauncherItem) => {
    if (isCompletelyOffline && isOnlineOnlyLauncherSlug(item.slug)) return;
    const to = item.getRoute(user);
    setQuery('');
    onClose();
    if (to !== location.pathname) {
      navigate(to);
    }
  };

  const title = 'Go anywhere in Custosell';
  const subtitle = isCompletelyOffline
    ? 'Some areas need a connection — greyed tiles open when you are online'
    : 'Open any page you can use';
  const searchPlaceholder = 'Search anything…';
  const countLabel = `${totalCount} page${totalCount === 1 ? '' : 's'}${query.trim() ? ' found' : ''}`;
  const emptyLabel = query.trim() ? 'Nothing matches your search.' : 'Nothing else is available on your account.';
  const workspaceLabel = 'Your workspace';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      titleCentered
      size="xl"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6 sm:py-4"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-indigo-200/80 bg-indigo-50/30 py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
            />
          </div>
          <p className="shrink-0 text-sm text-gray-600 sm:text-right">
            {countLabel}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
          {empty ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {emptyLabel}
            </p>
          ) : (
            <div className="space-y-4">
              {workspaceItems.length > 0 && (
                <section className="space-y-2">
                  <SectionHeading icon={LayoutGrid} label={workspaceLabel} tone="indigo" />
                  <ModuleGrid
                    items={workspaceItems}
                    activeSlug={activeSlug}
                    offline={isCompletelyOffline}
                    onSelect={handleSelect}
                  />
                </section>
              )}
              {platformItems.length > 0 && (
                <section className="space-y-2">
                  <SectionHeading icon={Shield} label="Platform" tone="violet" />
                  <ModuleGrid
                    items={platformItems}
                    activeSlug={activeSlug}
                    offline={isCompletelyOffline}
                    onSelect={handleSelect}
                  />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
