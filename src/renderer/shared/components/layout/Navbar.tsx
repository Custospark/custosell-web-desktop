import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useLogoutAction } from '../../../app/contexts/LogoutContext';
import { useConfirm } from '../Feedback/ConfirmContext';
import { useEndShiftAction } from '../../../modules/shifts/useEndShiftAction';
import { SyncHeaderChip } from '../Errors/SyncProgressBanner';
import { GuideHeaderNav } from './GuideHeaderNav';
import { ModuleLauncherButton } from './ModuleLauncherButton';
import { SHELL_HEADER_HEIGHT_CLASS } from './layoutConstants';
import { formatShiftDateTime } from '../../utils/formatDateTime';
import { getUserFirstName } from '../../utils/userDisplayName';
import { resolveBusinessDisplayName, resolveBusinessLogoPath, resolveUserMenuLabel } from '../../utils/shellDisplay';
import { avatarUrl } from '../../utils/avatarUrl';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useBusiness } from '../../../modules/settings/api/settings/BusinessQueries';
import {
  Menu, LogOut, ChevronDown, Clock, Wifi, SignalMedium, WifiOff, User, Building2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const NETWORK_STATUS_THEME = {
  online: {
    button: 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-200',
    icon: 'text-emerald-500',
    label: 'text-emerald-700',
    meta: 'text-emerald-500',
  },
  slow: {
    button: 'text-orange-700 hover:text-orange-800 hover:bg-orange-50 focus-visible:ring-orange-200',
    icon: 'text-orange-500',
    label: 'text-orange-700',
  },
  offline: {
    button: 'text-red-700 hover:text-red-800 hover:bg-red-50 focus-visible:ring-red-200',
    icon: 'text-red-500',
    label: 'text-red-700',
  },
} as const;

const networkStatusBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2';

const iconBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors';

const ACCOUNT_MENU_WIDTH_PX = 240;
const ACCOUNT_MENU_GAP_PX = 6;

function NavbarShiftBadge({ clockIn, className }: { clockIn: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 min-w-0 text-xs text-gray-500',
        className,
      )}
      title={`Shift started ${formatShiftDateTime(clockIn)}`}
    >
      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden />
      <span className="hidden lg:inline font-semibold text-gray-900 whitespace-nowrap">Shift started</span>
      <span className="font-medium text-blue-600 truncate tabular-nums">
        {formatShiftDateTime(clockIn)}
      </span>
    </div>
  );
}

function NavbarNetworkStatus({
  systemStatus,
  latency,
  onRetry,
}: {
  systemStatus: 'online' | 'slow' | 'offline';
  latency: number | null;
  onRetry: () => void;
}) {
  if (systemStatus === 'online') {
    const theme = NETWORK_STATUS_THEME.online;
    return (
      <button
        type="button"
        onClick={onRetry}
        data-tour="navbar-network"
        title={latency != null ? `Connected · ${latency}ms latency` : 'Connected'}
        aria-label={latency != null ? `Connected, ${latency} milliseconds latency` : 'Connected'}
        className={cn(networkStatusBtn, theme.button, 'gap-1 px-2 sm:px-2 h-11 w-11 sm:h-9 sm:w-auto')}
      >
        <Wifi className={cn('w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0', theme.icon)} aria-hidden />
        <span className={cn('hidden sm:inline font-semibold text-xs whitespace-nowrap', theme.label)}>Connected</span>
        {latency != null ? (
          <span className={cn('hidden xl:inline text-xs tabular-nums font-medium', theme.meta)}>{latency}ms</span>
        ) : null}
      </button>
    );
  }

  if (systemStatus === 'slow') {
    const theme = NETWORK_STATUS_THEME.slow;
    return (
      <button
        type="button"
        onClick={onRetry}
        data-tour="navbar-network"
        title="Slow connection — tap to retry"
        aria-label="Slow internet connection"
        className={cn(networkStatusBtn, theme.button, 'gap-1 px-2 sm:px-2 h-11 w-11 sm:h-9 sm:w-auto')}
      >
        <SignalMedium className={cn('w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0', theme.icon)} aria-hidden />
        <span className={cn('hidden sm:inline font-semibold text-xs whitespace-nowrap', theme.label)}>Slow</span>
        <span className={cn('hidden lg:inline font-semibold text-xs whitespace-nowrap', theme.label)}>Internet</span>
      </button>
    );
  }

  const theme = NETWORK_STATUS_THEME.offline;
  return (
    <button
      type="button"
      onClick={onRetry}
      data-tour="navbar-network"
      title="No internet connection — tap to retry"
      aria-label="No internet connection"
      className={cn(networkStatusBtn, theme.button, 'gap-1 px-2 sm:px-2 h-11 w-11 sm:h-9 sm:w-auto')}
    >
      <WifiOff className={cn('w-3.5 h-3.5 shrink-0', theme.icon)} aria-hidden />
      <span className={cn('hidden sm:inline font-semibold text-xs whitespace-nowrap', theme.label)}>Offline</span>
    </button>
  );
}

export function Navbar() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const { data: business } = useBusiness();
  const businessName = resolveBusinessDisplayName(user, business);
  const businessLogoUrl = avatarUrl(resolveBusinessLogoPath(user, business));
  const { logout, isLoggingOut } = useLogoutAction();
  const { confirm } = useConfirm();
  const { requestEndShift, isEnding } = useEndShiftAction();
  const { systemStatus, latency, retryConnection } = useNetworkStatus();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: ACCOUNT_MENU_WIDTH_PX });

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(ACCOUNT_MENU_WIDTH_PX, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setMenuPos({ top: rect.bottom + ACCOUNT_MENU_GAP_PX, left, width });
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' });
    } else {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  };

  const isLargeScreen = window.innerWidth >= 1024;
  const sidebarLabel = (isLargeScreen ? !state.sidebarCollapsed : state.sidebarOpen) ? 'Hide sidebar' : 'Show sidebar';

  useLayoutEffect(() => {
    if (!dropdownOpen) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [dropdownOpen, updateMenuPosition]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setDropdownOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    const firstName = getUserFirstName(user?.name);
    const msg = user?.shift_clock_in
      ? `${firstName}, your shift will remain active. You can resume when you log back in.`
      : `${firstName}, are you sure you want to logout?`;
    const confirmed = await confirm({
      title: 'Logout',
      message: msg,
      confirmText: 'Logout',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!confirmed) return;
    setDropdownOpen(false);
    void logout();
  };

  const handleEndShift = async () => {
    setDropdownOpen(false);
    await requestEndShift();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-10 shrink-0 bg-white border-b border-gray-200',
        SHELL_HEADER_HEIGHT_CLASS,
        'pl-3 sm:pl-4 lg:pl-3 pr-3 sm:pr-4 lg:pr-6',
      )}
    >
      <div className="flex h-full items-center gap-3 sm:gap-3 lg:gap-3 min-w-0">
        <div className="hidden lg:flex min-w-0 flex-1 items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className={cn(iconBtn, 'w-10 h-10 sm:w-9 sm:h-9 shrink-0')}
            title={sidebarLabel}
            aria-label={sidebarLabel}
            data-tour="sidebar-hamburger"
          >
            <Menu className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>

          {businessName && (
            <div
              className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50/80 px-2.5 py-2 ring-1 ring-slate-100 sm:px-2.5 sm:py-1.5"
              title={businessName}
            >
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ) : (
                <Building2 className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 sm:text-base max-w-[8rem] sm:max-w-[14rem] md:max-w-[20rem] lg:max-w-[28rem] xl:max-w-[36rem]">
                  {businessName}
                </p>
              </div>
            </div>
          )}

          {user?.shift_clock_in && (
            <NavbarShiftBadge
              clockIn={user.shift_clock_in}
              className="hidden lg:flex max-w-[12rem] xl:max-w-none shrink-0"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <SyncHeaderChip />
            <NavbarNetworkStatus
              systemStatus={systemStatus}
              latency={latency}
              onRetry={retryConnection}
            />
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" aria-hidden />

          <ModuleLauncherButton />

          <GuideHeaderNav />

          <div className="shrink-0">
            <button
              ref={triggerRef}
              type="button"
              data-tour="navbar-profile"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              aria-label={`Account menu for ${user?.name ?? 'user'}`}
              className={cn(
                iconBtn,
                'gap-1.5 pl-0.5 pr-1 sm:px-1.5 h-11 w-11 sm:h-9 sm:w-auto max-w-[3rem] sm:max-w-[11rem] md:max-w-[14rem]',
              )}
            >
              {user?.avatar ? (
                <img src={avatarUrl(user.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600 shrink-0 ring-2 ring-white">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-sm text-gray-700 truncate hidden md:inline max-w-[8rem] lg:max-w-[10rem]">
                {resolveUserMenuLabel(user?.name)}
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block transition-transform',
                  dropdownOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {dropdownOpen && typeof document !== 'undefined' && createPortal(
              <div
                ref={menuRef}
                role="menu"
                className="fixed z-[300] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
                style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 break-words">{user?.name || 'User'}</p>
                  {user?.email && (
                    <p className="text-xs text-gray-500 truncate mt-0.5" title={user.email}>{user.email}</p>
                  )}
                  {user?.shift_clock_in && (
                    <div className="md:hidden mt-2 pt-2 border-t border-gray-100">
                      <NavbarShiftBadge clockIn={user.shift_clock_in} />
                    </div>
                  )}
                </div>
                <Link
                  to={ROUTES.ACCOUNT.PROFILE}
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 shrink-0" aria-hidden />
                  My Profile
                </Link>
                {user?.shift_clock_in && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleEndShift}
                      disabled={isEnding}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      {isEnding ? 'Ending shift…' : 'End Shift'}
                    </button>
                    <hr className="border-gray-100" />
                  </>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>,
              document.body,
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
