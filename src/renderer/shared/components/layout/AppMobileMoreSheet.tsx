import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { Compass, Search, X } from 'lucide-react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { cn } from '../../utils/cn';
import ModuleLauncherModal from './ModuleLauncherModal';
import {
  isSidebarSubItemActive,
  type AccessibleNavLeaf,
} from './resolveAccessibleNavLeaves';
import { isOnlineOnlyNavTarget, onlineOnlyHoverMessage } from './onlineOnlyNav';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { OfflineDisabledNav } from './OfflineDisabledNav';

interface AppMobileMoreSheetProps {
  remainingLeaves: AccessibleNavLeaf[];
  pathname: string;
}

/** Mount only while `mobileMoreOpen` so local browse-app state resets on each open. */
export function AppMobileMoreSheet({ remainingLeaves, pathname }: AppMobileMoreSheetProps) {
  const { dispatch } = useAppContext();
  const { isCompletelyOffline } = useNetworkStatus();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredLeaves = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return remainingLeaves;
    return remainingLeaves.filter(
      (leaf) =>
        leaf.label.toLowerCase().includes(q)
        || leaf.groupLabel.toLowerCase().includes(q),
    );
  }, [remainingLeaves, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AccessibleNavLeaf[]>();
    for (const leaf of filteredLeaves) {
      const list = map.get(leaf.groupLabel) ?? [];
      list.push(leaf);
      map.set(leaf.groupLabel, list);
    }
    return Array.from(map.entries());
  }, [filteredLeaves]);

  if (typeof document === 'undefined') return null;

  const close = () => dispatch({ type: 'SET_MOBILE_MORE_OPEN', payload: false });

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[45] bg-black/40 lg:hidden"
        aria-label="Close more"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className={cn(
          'fixed inset-x-0 top-16 bottom-0 z-[46] flex flex-col border-t border-slate-200 bg-white shadow-2xl lg:hidden',
          'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        )}
      >
        <div className="flex shrink-0 items-center justify-center gap-3 px-4 py-4">
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900">More</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Every part of Custosell at your fingertips
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="absolute right-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
          <button
            type="button"
            onClick={() => setBrowseOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-3.5 py-3.5 text-left text-white shadow-sm transition active:bg-blue-700"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold tracking-tight">Browse Custosell</span>
              <span className="mt-0.5 block text-xs text-blue-100">
                Open any part of Custosell you can use
              </span>
            </span>
          </button>

          {remainingLeaves.length > 4 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter shortcuts…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          ) : null}

          {grouped.length === 0 ? (
            <p className="px-1 py-8 text-center text-sm text-slate-500">
              {filter.trim()
                ? 'No shortcuts match — try Browse Custosell, or open Menu.'
                : 'No extra shortcuts here — use Browse Custosell, or open Menu for the full list.'}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Quick links
              </p>
              {grouped.map(([groupLabel, leaves]) => (
                <div key={groupLabel}>
                  <p className="mb-1.5 px-1 text-xs font-medium text-slate-500">
                    {groupLabel}
                  </p>
                  <ul className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60">
                    {leaves.map((leaf, index) => {
                      const Icon = leaf.icon;
                      const active = isSidebarSubItemActive(pathname, leaf.to);
                      const blocked = isCompletelyOffline && isOnlineOnlyNavTarget(leaf.to);
                      const divider = index > 0 ? 'border-t border-slate-100' : '';
                      if (blocked) {
                        return (
                          <li key={leaf.to} className={divider}>
                            <OfflineDisabledNav
                              title={onlineOnlyHoverMessage(leaf.to)}
                              className="gap-3 px-3 py-3 text-sm text-gray-400"
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{leaf.label}</span>
                            </OfflineDisabledNav>
                          </li>
                        );
                      }
                      return (
                        <li key={leaf.to} className={divider}>
                          <NavLink
                            to={leaf.to}
                            onClick={close}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 text-sm transition-colors',
                              active
                                ? 'bg-blue-50 font-medium text-blue-700'
                                : 'text-slate-700 active:bg-white',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="truncate">{leaf.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ModuleLauncherModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        friendlyCopy
      />
    </>,
    document.body,
  );
}
