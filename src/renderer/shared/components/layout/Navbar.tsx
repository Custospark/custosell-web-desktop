import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useLogoutAction } from '../../../app/contexts/LogoutContext';
import { useConfirm } from '../Feedback/ConfirmContext';
import { useEndShiftAction } from '../../../modules/shifts/useEndShiftAction';
import { SyncHeaderChip } from '../Errors/SyncProgressBanner';
import { GuideHeaderNav } from './GuideHeaderNav';
import { SHELL_HEADER_HEIGHT_CLASS } from './layoutConstants';
import { formatShiftDateTime } from '../../utils/formatDateTime';
import { getUserFirstName } from '../../utils/userDisplayName';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import {
  Menu, LogOut, ChevronDown, Clock, Wifi, SignalMedium, WifiOff, User,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const BUSINESS_NAME_DISPLAY_MAX = 25;

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

function displayBusinessName(name: string): string {
  if (name.length <= BUSINESS_NAME_DISPLAY_MAX) return name;
  return `${name.slice(0, BUSINESS_NAME_DISPLAY_MAX - 1)}…`;
}

const iconBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors';

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
        title={latency != null ? `Connected · ${latency}ms latency` : 'Connected'}
        aria-label={latency != null ? `Connected, ${latency} milliseconds latency` : 'Connected'}
        className={cn(networkStatusBtn, theme.button, 'gap-1 px-1.5 sm:px-2 h-8 sm:h-9')}
      >
        <Wifi className={cn('w-3.5 h-3.5 shrink-0', theme.icon)} aria-hidden />
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
        title="Slow connection — tap to retry"
        aria-label="Slow internet connection"
        className={cn(networkStatusBtn, theme.button, 'gap-1 px-1.5 sm:px-2 h-8 sm:h-9')}
      >
        <SignalMedium className={cn('w-3.5 h-3.5 shrink-0', theme.icon)} aria-hidden />
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
      title="No internet connection — tap to retry"
      aria-label="No internet connection"
      className={cn(networkStatusBtn, theme.button, 'gap-1 px-1.5 sm:px-2 h-8 sm:h-9')}
    >
      <WifiOff className={cn('w-3.5 h-3.5 shrink-0', theme.icon)} aria-hidden />
      <span className={cn('hidden sm:inline font-semibold text-xs whitespace-nowrap', theme.label)}>Offline</span>
    </button>
  );
}

export function Navbar() {
  const { state, dispatch } = useAppContext();
  const user = useAppSelector((s) => s.auth.user);
  const { logout, isLoggingOut } = useLogoutAction();
  const { confirm } = useConfirm();
  const { requestEndShift, isEnding } = useEndShiftAction();
  const { systemStatus, latency, retryConnection } = useNetworkStatus();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      dispatch({ type: 'TOGGLE_SIDEBAR_COLLAPSED' });
    } else {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  };

  const isLargeScreen = window.innerWidth >= 1024;
  const sidebarShowing = isLargeScreen ? !state.sidebarCollapsed : state.sidebarOpen;
  const sidebarLabel = sidebarShowing ? 'Hide sidebar' : 'Show sidebar';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        'px-2 sm:px-4 lg:px-6',
      )}
    >
      <div
        className={cn(
          'grid h-full items-center gap-x-1 sm:gap-x-2 md:gap-x-3',
          'grid-cols-[auto_minmax(0,1fr)_auto]',
        )}
      >
        {/* Left — menu toggle + shift */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className={cn(iconBtn, 'w-8 h-8 sm:w-9 sm:h-9')}
            title={sidebarLabel}
            aria-label={sidebarLabel}
          >
            <Menu className="w-5 h-5" />
          </button>

          {user?.shift_clock_in && (
            <NavbarShiftBadge
              clockIn={user.shift_clock_in}
              className="hidden md:flex max-w-[10rem] lg:max-w-[14rem] xl:max-w-none"
            />
          )}
        </div>

        {/* Center — business name */}
        <div className="flex justify-center min-w-0 px-0.5 sm:px-1">
          {user?.business_name && (
            <span
              className={cn(
                'font-semibold text-blue-600 text-center',
                'text-[11px] sm:text-xs md:text-sm lg:text-base',
              )}
              title={user.business_name}
            >
              {displayBusinessName(user.business_name)}
            </span>
          )}
        </div>

        {/* Right — status, guide, user */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 md:gap-2 min-w-0">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <SyncHeaderChip />
            <NavbarNetworkStatus
              systemStatus={systemStatus}
              latency={latency}
              onRetry={retryConnection}
            />
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" aria-hidden />

          <GuideHeaderNav />

          <div ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              className={cn(
                iconBtn,
                'gap-1 sm:gap-1.5 pl-0.5 pr-1 sm:px-1.5 h-8 sm:h-9 max-w-[9rem] sm:max-w-[12rem] md:max-w-[14rem]',
              )}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600 shrink-0">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-xs sm:text-sm text-gray-700 truncate hidden sm:inline">
                {user?.name || 'User'}
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-gray-400 shrink-0 hidden sm:block transition-transform',
                  dropdownOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 w-[min(100vw-1rem,15rem)] sm:w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                  {user?.email && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
