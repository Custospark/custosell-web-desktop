import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CloudUpload, PauseCircle, RefreshCw, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { syncBannerDismissed } from '../../../app/store/slices/syncSlice';
import { selectSystemStatus } from '../../../app/store/slices/networkSlice';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Badge } from '../badges/Badge';
import { cn } from '../../utils/cn';
import { formatEtaMinutes, getSyncHeadline, getSyncDetailLabel } from './syncBannerCopy';

const SUCCESS_AUTO_DISMISS_MS = 3500;

/** Toast / banner tokens from DESIGN_SYSTEM.md */
const BANNER_STYLES = {
  info: {
    shell: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-500',
    detail: 'text-blue-600',
    dot: 'text-blue-400',
    track: 'bg-blue-100',
    fill: 'bg-blue-600',
    dismiss: 'text-blue-400 hover:text-blue-700 hover:bg-blue-100',
  },
  warning: {
    shell: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-500',
    detail: 'text-amber-600',
    dot: 'text-amber-400',
    track: 'bg-amber-100',
    fill: 'bg-amber-500',
    dismiss: 'text-amber-400 hover:text-amber-700 hover:bg-amber-100',
  },
  success: {
    shell: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-500',
    detail: 'text-green-600',
    dot: 'text-green-400',
    track: 'bg-green-100',
    fill: 'bg-green-600',
    dismiss: 'text-green-400 hover:text-green-700 hover:bg-green-100',
  },
  error: {
    shell: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-500',
    detail: 'text-red-600',
    dot: 'text-red-400',
    track: 'bg-red-100',
    fill: 'bg-red-600',
    dismiss: 'text-red-400 hover:text-red-700 hover:bg-red-100',
  },
} as const;

function useSyncRate(synced: number, startedAt: string | null, running: boolean): number | null {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    if (!running || !startedAt || synced === 0) {
      setRate(null);
      return;
    }

    const update = () => {
      const elapsedSec = (Date.now() - new Date(startedAt).getTime()) / 1000;
      if (elapsedSec < 10) {
        setRate(null);
        return;
      }
      setRate(Math.max(1, Math.round((synced / elapsedSec) * 60)));
    };

    update();
    const id = window.setInterval(update, 2000);
    return () => clearInterval(id);
  }, [synced, startedAt, running]);

  return rate;
}

function SyncProgressTrack({
  percent,
  tone,
}: {
  percent: number;
  tone: keyof typeof BANNER_STYLES;
}) {
  const styles = BANNER_STYLES[tone];
  return (
    <div className={cn('h-1.5 w-full rounded-full overflow-hidden', styles.track)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', styles.fill)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Matches OfflineBanner / AuthPendingBanner layout + progress track. */
function SyncInProgressStrip({
  percent,
  processed,
  total,
  synced,
  failed,
  remaining,
  phaseLabel,
  isPaused,
  isOffline,
  startedAt,
}: {
  percent: number;
  processed: number;
  total: number;
  synced: number;
  failed: number;
  remaining: number;
  phaseLabel: string;
  isPaused: boolean;
  isOffline: boolean;
  startedAt: string | null;
}) {
  const tone = isPaused ? 'warning' : 'info';
  const styles = BANNER_STYLES[tone];
  const rate = useSyncRate(synced, startedAt, !isPaused);
  const eta = rate ? formatEtaMinutes(remaining, rate) : null;
  const headline = getSyncHeadline(phaseLabel, isPaused, isOffline);
  const detail = getSyncDetailLabel(phaseLabel);

  const secondaryParts = [
    `${processed} of ${total}`,
    detail,
    rate && !isPaused ? `~${rate}/min` : null,
    eta && !isPaused ? eta : null,
    failed > 0 ? `${failed} failed` : null,
    isPaused && isOffline ? `${remaining} waiting` : null,
    isPaused && !isOffline ? 'Resumes when online' : null,
  ].filter(Boolean);

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${headline}. ${processed} of ${total}. ${percent} percent.`}
      aria-live="polite"
      className={cn('relative z-40 shrink-0 border-b text-sm', styles.shell)}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {isPaused ? (
          <PauseCircle className={cn('w-4 h-4 shrink-0', styles.icon)} aria-hidden />
        ) : (
          <CloudUpload className={cn('w-4 h-4 shrink-0', styles.icon)} aria-hidden />
        )}

        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{headline}</span>
          {secondaryParts.length > 0 && (
            <>
              <span className={cn('hidden sm:inline', styles.dot)}>·</span>
              <span className={styles.detail}>{secondaryParts.join(' · ')}</span>
            </>
          )}
        </div>

        <Badge variant={isPaused ? 'warning' : 'primary'}>{percent}%</Badge>
      </div>

      <div className="px-4 pb-2.5">
        <SyncProgressTrack percent={percent} tone={tone} />
      </div>
    </div>
  );
}

function SyncStatusStrip({
  tone,
  icon: Icon,
  message,
  detail,
  exiting,
  actions,
}: {
  tone: keyof typeof BANNER_STYLES;
  icon: typeof CheckCircle2;
  message: string;
  detail?: string;
  exiting?: boolean;
  actions?: ReactNode;
}) {
  const styles = BANNER_STYLES[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative z-40 shrink-0 border-b text-sm transition-opacity duration-300',
        styles.shell,
        exiting && 'opacity-0',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Icon className={cn('w-4 h-4 shrink-0', styles.icon)} aria-hidden />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{message}</span>
          {detail && (
            <>
              <span className={cn('hidden sm:inline', styles.dot)}>·</span>
              <span className={styles.detail}>{detail}</span>
            </>
          )}
        </div>
        {actions}
      </div>
      {tone === 'success' && (
        <div className="px-4 pb-2.5">
          <SyncProgressTrack percent={100} tone="success" />
        </div>
      )}
    </div>
  );
}

function DismissButton({
  tone,
  onClick,
}: {
  tone: keyof typeof BANNER_STYLES;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('shrink-0 p-1 rounded-md transition-colors', BANNER_STYLES[tone].dismiss)}
      aria-label="Dismiss"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

/** Matches header network status chip styling (Layout.tsx). */
export function SyncHeaderChip() {
  const sync = useAppSelector((state) => state.sync);
  const isActive = sync.status === 'running' || sync.status === 'paused';
  if (sync.dismissed || !isActive) return null;

  const processed = sync.totalSynced + sync.totalFailed;
  const total = Math.max(sync.totalPending, processed, 1);
  const percent = Math.min(100, Math.round((processed / total) * 100));
  const isPaused = sync.status === 'paused';

  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium shrink-0',
        isPaused ? 'text-amber-600' : 'text-blue-600',
      )}
      title={`Syncing ${processed} of ${total}`}
    >
      {isPaused ? (
        <PauseCircle className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />
      )}
      <span className="tabular-nums">{percent}%</span>
    </span>
  );
}

export function SyncProgressBanner() {
  const dispatch = useAppDispatch();
  const sync = useAppSelector((state) => state.sync);
  const systemStatus = useAppSelector(selectSystemStatus);
  const [exiting, setExiting] = useState(false);

  const isRunning = sync.status === 'running';
  const isPaused = sync.status === 'paused';
  const isComplete = sync.status === 'complete';
  const isFailed = sync.status === 'failed';
  const isCleanSuccess = isComplete && sync.totalFailed === 0 && sync.shiftCloseWarnings === 0;
  const isOffline = systemStatus === 'offline';

  const processed = sync.totalSynced + sync.totalFailed;
  const total = Math.max(sync.totalPending, processed, 1);
  const remaining = Math.max(0, sync.totalPending - processed);
  const percent = Math.min(100, Math.round((processed / total) * 100));

  const visible = !sync.dismissed && sync.status !== 'idle';

  useEffect(() => {
    if (!isCleanSuccess) return;
    const fadeTimer = window.setTimeout(() => setExiting(true), SUCCESS_AUTO_DISMISS_MS - 300);
    const dismissTimer = window.setTimeout(() => dispatch(syncBannerDismissed()), SUCCESS_AUTO_DISMISS_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [isCleanSuccess, dispatch]);

  if (!visible) return null;

  if (isRunning || isPaused) {
    return (
      <SyncInProgressStrip
        percent={percent}
        processed={processed}
        total={sync.totalPending}
        synced={sync.totalSynced}
        failed={sync.totalFailed}
        remaining={remaining}
        phaseLabel={sync.phaseLabel}
        isPaused={isPaused}
        isOffline={isOffline}
        startedAt={sync.startedAt}
      />
    );
  }

  if (isCleanSuccess) {
    return (
      <SyncStatusStrip
        tone="success"
        icon={CheckCircle2}
        message="Everything synced"
        detail={`${sync.totalSynced} transaction${sync.totalSynced === 1 ? '' : 's'} uploaded`}
        exiting={exiting}
      />
    );
  }

  if (isFailed) {
    return (
      <SyncStatusStrip
        tone="error"
        icon={AlertTriangle}
        message={sync.lastError ?? 'Sync interrupted'}
        actions={<DismissButton tone="error" onClick={() => dispatch(syncBannerDismissed())} />}
      />
    );
  }

  if (isComplete && sync.totalFailed > 0) {
    return (
      <SyncStatusStrip
        tone="warning"
        icon={AlertTriangle}
        message={`${sync.totalFailed} item${sync.totalFailed === 1 ? '' : 's'} failed to sync`}
        actions={
          <>
            <Link to={ROUTES.SALES.HISTORY} className="text-xs font-semibold underline shrink-0 text-amber-800">
              Review
            </Link>
            <DismissButton tone="warning" onClick={() => dispatch(syncBannerDismissed())} />
          </>
        }
      />
    );
  }

  if (isComplete && sync.shiftCloseWarnings > 0) {
    return (
      <SyncStatusStrip
        tone="warning"
        icon={AlertTriangle}
        message="Shift closed with unsynced items"
        actions={
          <>
            <Link to={ROUTES.SALES.HISTORY} className="text-xs font-semibold underline shrink-0 text-amber-800">
              Review
            </Link>
            <DismissButton tone="warning" onClick={() => dispatch(syncBannerDismissed())} />
          </>
        }
      />
    );
  }

  return null;
}
