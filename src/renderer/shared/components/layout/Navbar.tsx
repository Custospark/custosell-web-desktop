import { useState, useRef, useEffect, useLayoutEffect, useCallback, useSyncExternalStore } from 'react';
import { useAppContext } from '../../../app/contexts/AppContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useLogoutAction } from '../../../app/contexts/useLogoutActions';
import { useConfirm } from '../Feedback/ConfirmContext';
import { useEndShiftAction } from '../../../modules/shifts/useEndShiftAction';
import { SyncHeaderChip } from '../Errors/SyncProgressBanner';
import { GuideHeaderNav } from './GuideHeaderNav';
import { ModuleLauncherButton } from './ModuleLauncherButton';
import { useUpdateOnboarding } from '../../../modules/onboarding/useOnboardingQueries';
import { SHELL_HEADER_HEIGHT_CLASS } from './layoutConstants';
import { formatShiftDateTime } from '../../utils/formatDateTime';
import { getUserFirstName } from '../../utils/userDisplayName';
import { resolveBusinessDisplayName, resolveBusinessLogoPath, resolveUserMenuLabel } from '../../utils/shellDisplay';
import { avatarUrl } from '../../utils/avatarUrl';
import { initialsFromName } from '../UserAvatar';
import { useBusiness } from '../../../modules/settings/api/settings/BusinessQueries';
import { UserProfileMenu } from './UserProfileMenu';
import SubscriptionDropdown from './SubscriptionDropdown';
import ReferralDropdown from './ReferralDropdown';
import {
  Menu, ChevronDown, Clock, Wifi, SignalMedium, WifiOff, Building2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { isBusinessOwner } from '../../utils/moduleAccess';

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

const ACCOUNT_MENU_WIDTH_PX = 280;
const ACCOUNT_MENU_GAP_PX = 6;
const LG_MQ = '(min-width: 1024px)';

function subscribeLgBreakpoint(onStoreChange: () => void) {
  const mq = window.matchMedia(LG_MQ);
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getLgBreakpointSnapshot() {
  return window.matchMedia(LG_MQ).matches;
}

function getLgBreakpointServerSnapshot() {
  return false;
}

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
  const businessName =
    user?.account_type === 'personal' ? 'Personal'
    : user?.account_type === 'storefront_buyer' ? 'Shopping'
    : resolveBusinessDisplayName(user, business);
  const businessLogoUrl = avatarUrl(resolveBusinessLogoPath(user, business));
  const { logout, isLoggingOut } = useLogoutAction();
  const { confirm } = useConfirm();
  const { requestEndShift, isEnding } = useEndShiftAction();
  const replayTour = useUpdateOnboarding();
  const { systemStatus, latency, retryConnection } = useNetworkStatus();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null!);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: ACCOUNT_MENU_WIDTH_PX });
  /** Match Layout / ProductTour `lg` (1024) — hamburger + logo stay out of the DOM on mobile. */
  const isDesktopChrome = useSyncExternalStore(
    subscribeLgBreakpoint,
    getLgBreakpointSnapshot,
    getLgBreakpointServerSnapshot,
  );

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

  const sidebarLabel = (isDesktopChrome ? !state.sidebarCollapsed : state.sidebarOpen)
    ? 'Hide sidebar'
    : 'Show sidebar';

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
      <div className="flex h-full items-center gap-3 min-w-0">
        <div className="hidden lg:flex min-w-0 flex-1 items-center gap-3">
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

          {businessName ? (
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
              <div className="min-w-0 flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-900 sm:text-base max-w-[9rem] sm:max-w-[14rem] md:max-w-[20rem] lg:max-w-[28rem] xl:max-w-[36rem]">
                  {businessName}
                </p>
                {isBusinessOwner(user) && user?.business?.subscription?.plan_slug ? (
                  <span className={cn(
                    'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none',
                    user.business.subscription.plan_slug === 'essential' && 'bg-blue-100 text-blue-700',
                    user.business.subscription.plan_slug === 'professional' && 'bg-indigo-100 text-indigo-700',
                    user.business.subscription.plan_slug === 'enterprise' && 'bg-violet-100 text-violet-700',
                    user.business.subscription.plan_slug === 'personal' && 'bg-emerald-100 text-emerald-700',
                  )}>
                    {user.business.subscription.plan_slug.slice(0, 3).replace(/^\w/, c => c.toUpperCase())}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {user?.shift_clock_in ? (
            <NavbarShiftBadge
              clockIn={user.shift_clock_in}
              className="max-w-[12rem] xl:max-w-none shrink-0"
            />
          ) : null}
        </div>

        <div className="flex flex-1 items-center justify-center gap-2 sm:gap-2 lg:flex-initial lg:justify-end shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <SyncHeaderChip />
            <span className="hidden lg:inline-flex items-center">
              <NavbarNetworkStatus
                systemStatus={systemStatus}
                latency={latency}
                onRetry={retryConnection}
              />
            </span>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" aria-hidden />

          <ModuleLauncherButton />

          <GuideHeaderNav />

          <div data-tour="navbar-referral"><ReferralDropdown /></div>

          {isBusinessOwner(user) && <div data-tour="navbar-subscription"><SubscriptionDropdown /></div>}

          <div className="shrink-0 pr-3">
            <button
              ref={triggerRef}
              type="button"
              data-tour="navbar-profile"
              onClick={() => { setDropdownOpen((o) => !o); }}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              aria-label={`Account menu for ${user?.name ?? 'user'}`}
              className={cn(
                iconBtn,
                'gap-1.5 px-1 sm:px-1.5 h-11 w-11 sm:h-9 sm:w-auto sm:max-w-[11rem] md:max-w-[14rem]',
              )}
            >
              {user?.avatar ? (
                <img src={avatarUrl(user.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0 ring-2 ring-white">
                  {initialsFromName(user?.name || 'U')}
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

            <UserProfileMenu
              menuRef={menuRef}
              menuPos={menuPos}
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              onEndShift={handleEndShift}
              isEnding={isEnding}
              onReplayTour={() => replayTour.mutate({ action: 'replay_tour' })}
              isReplaying={replayTour.isPending}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
