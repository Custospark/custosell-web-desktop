import { Activity, AlertTriangle, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { getDesktopAppVersion } from '../../config/desktopRelease';
import { cn } from '../../utils/cn';

const STATUS_THEME = {
  online: {
    label: 'Connected',
    icon: Activity,
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70',
    iconClass: 'text-emerald-500',
    pulse: true,
  },
  slow: {
    label: 'Slow',
    icon: AlertTriangle,
    pill: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100/70',
    iconClass: 'text-orange-500',
    pulse: true,
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    pill: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70',
    iconClass: 'text-red-500',
    pulse: false,
  },
} as const;

/**
 * TopBarStatus — connectivity + app version, the left cluster of the global
 * search top bar (mirrors Custocare's SystemStatusIndicator). The pill doubles
 * as a retry trigger when the connection is slow or down.
 */
export function TopBarStatus() {
  const { systemStatus, latency, retryConnection } = useNetworkStatus();
  const theme = STATUS_THEME[systemStatus];
  const Icon = theme.icon;

  const title =
    systemStatus === 'online'
      ? latency != null ? `Connected · ${latency}ms latency` : 'Connected'
      : systemStatus === 'slow'
        ? 'Slow connection — tap to retry'
        : 'No internet connection — tap to retry';

  return (
    <div className="flex min-w-0 flex-shrink-0 items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={retryConnection}
        data-tour="navbar-network"
        title={title}
        aria-label={title}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium sm:px-2.5',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
          theme.pill,
        )}
      >
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', theme.iconClass, theme.pulse && 'animate-pulse')}
          aria-hidden
        />
        <span className="truncate">{theme.label}</span>
        {systemStatus === 'online' && latency != null && (
          <span className="hidden tabular-nums text-[10px] opacity-70 md:inline">{latency}ms</span>
        )}
      </button>

      <span className="hidden rounded-full border border-gray-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-gray-500 md:inline-flex">
        v{getDesktopAppVersion()}
      </span>
    </div>
  );
}
