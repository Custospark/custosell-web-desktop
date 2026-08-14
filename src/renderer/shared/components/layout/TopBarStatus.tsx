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
    label: 'Slow Connection',
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

function formatLatency(ms: number | null): string {
  if (ms === null) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatLastChecked(date: Date | null): string {
  if (!date) return 'Never';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

/**
 * TopBarStatus - the left cluster of the global search top bar, mirroring
 * Custocare's SystemStatusIndicator: a connection pill (with latency), a last
 * checked timestamp, and the app version. The pill doubles as a retry trigger
 * when the connection is slow or down.
 */
export function TopBarStatus() {
  const { systemStatus, latency, lastCheckedAt, retryConnection } = useNetworkStatus();
  const theme = STATUS_THEME[systemStatus];
  const Icon = theme.icon;
  const lastChecked = lastCheckedAt ? new Date(lastCheckedAt) : null;

  const title =
    systemStatus === 'online'
      ? latency != null ? `Connected · ${formatLatency(latency)} latency` : 'Connected'
      : systemStatus === 'slow'
        ? 'Slow connection - tap to retry'
        : 'No internet connection - tap to retry';

  return (
    <div className="hidden min-w-0 flex-shrink-0 items-center gap-1 sm:flex sm:gap-2">
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
          <span className="hidden tabular-nums text-[10px] opacity-70 md:inline">{formatLatency(latency)}</span>
        )}
      </button>

      <span
        className="hidden rounded border border-gray-200 bg-slate-50 px-2 py-1 text-xs text-gray-500 md:inline"
        title={lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Never checked'}
      >
        {formatLastChecked(lastChecked)}
      </span>

      <span className="hidden rounded border border-gray-200 bg-slate-50 px-2 py-1 text-xs text-gray-500 lg:inline">
        Version {getDesktopAppVersion()}
      </span>
    </div>
  );
}
