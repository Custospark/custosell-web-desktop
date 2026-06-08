import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CloudUpload, PauseCircle, RefreshCw, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { syncBannerDismissed } from '../../../app/store/slices/syncSlice';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../utils/cn';

const SUCCESS_AUTO_DISMISS_MS = 3500;

/** Visible sync strip — same slot as OfflineBanner, static in page flow. */
function SyncInProgressStrip({
  percent,
  processed,
  total,
  synced,
  failed,
  phaseLabel,
  isPaused,
}: {
  percent: number;
  processed: number;
  total: number;
  synced: number;
  failed: number;
  phaseLabel: string;
  isPaused: boolean;
}) {
  const label = isPaused
    ? `Sync paused · ${processed} of ${total} processed`
    : `Syncing offline work · ${processed} of ${total} processed`;

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'relative z-40 shrink-0 border-b text-sm',
        isPaused
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900',
      )}
    >
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-2">
        {isPaused ? (
          <PauseCircle className="w-4 h-4 shrink-0 text-amber-600" aria-hidden />
        ) : (
          <CloudUpload className="w-4 h-4 shrink-0 text-blue-600" aria-hidden />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold">
              {isPaused ? 'Sync paused' : 'Sync in progress'}
            </span>
            {!isPaused && (
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" aria-hidden />
            )}
            <span className={cn('hidden sm:inline', isPaused ? 'text-amber-600' : 'text-blue-600')}>
              ·
            </span>
            <span className={cn('text-xs sm:text-sm', isPaused ? 'text-amber-700' : 'text-blue-700')}>
              {processed} of {total} items
              {phaseLabel ? ` · ${phaseLabel}` : ''}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-700/80">
            <span>{synced} synced</span>
            {failed > 0 && <span className="text-amber-700">{failed} failed</span>}
            {isPaused && (
              <span className="text-amber-700">Will resume when you&apos;re back online</span>
            )}
          </div>
        </div>

        <span
          className={cn(
            'shrink-0 text-base font-bold tabular-nums',
            isPaused ? 'text-amber-700' : 'text-blue-700',
          )}
        >
          {percent}%
        </span>
      </div>

      <div className="px-4 pb-2.5">
        <div
          className={cn(
            'h-2 w-full rounded-full overflow-hidden',
            isPaused ? 'bg-amber-200/70' : 'bg-blue-200/70',
          )}
        >
          <div
            className={cn(
              'relative h-full rounded-full transition-[width] duration-500 ease-out',
              isPaused ? 'bg-amber-500' : 'bg-blue-600 sync-shimmer-bar',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SyncStatusStrip({
  icon: Icon,
  iconClass,
  bgClass,
  message,
  detail,
  exiting,
  actions,
}: {
  icon: typeof CheckCircle2;
  iconClass: string;
  bgClass: string;
  message: string;
  detail?: string;
  exiting?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative z-40 shrink-0 border-b text-sm transition-opacity duration-300',
        bgClass,
        exiting && 'opacity-0',
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <Icon className={cn('w-4 h-4 shrink-0', iconClass)} aria-hidden />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{message}</span>
          {detail && <span className="text-xs opacity-75">{detail}</span>}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function SyncProgressBanner() {
  const dispatch = useAppDispatch();
  const sync = useAppSelector((state) => state.sync);
  const [exiting, setExiting] = useState(false);

  const isRunning = sync.status === 'running';
  const isPaused = sync.status === 'paused';
  const isComplete = sync.status === 'complete';
  const isFailed = sync.status === 'failed';
  const isCleanSuccess = isComplete && sync.totalFailed === 0 && sync.shiftCloseWarnings === 0;

  const processed = sync.totalSynced + sync.totalFailed;
  const total = Math.max(sync.totalPending, processed, 1);
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
        phaseLabel={sync.phaseLabel}
        isPaused={isPaused}
      />
    );
  }

  if (isCleanSuccess) {
    return (
      <SyncStatusStrip
        icon={CheckCircle2}
        iconClass="text-emerald-600 sync-success-pop"
        bgClass="bg-emerald-50 border-emerald-200 text-emerald-900"
        message="Everything synced"
        detail={`${sync.totalSynced} uploaded`}
        exiting={exiting}
      />
    );
  }

  if (isFailed) {
    return (
      <SyncStatusStrip
        icon={AlertTriangle}
        iconClass="text-red-600"
        bgClass="bg-red-50 border-red-200 text-red-800"
        message={sync.lastError ?? 'Sync interrupted'}
        actions={
          <button
            type="button"
            onClick={() => dispatch(syncBannerDismissed())}
            className="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-red-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        }
      />
    );
  }

  if (isComplete && sync.totalFailed > 0) {
    return (
      <SyncStatusStrip
        icon={AlertTriangle}
        iconClass="text-amber-600"
        bgClass="bg-amber-50 border-amber-200 text-amber-900"
        message={`${sync.totalFailed} item${sync.totalFailed === 1 ? '' : 's'} failed to sync`}
        actions={
          <>
            <Link to={ROUTES.SALES.HISTORY} className="text-xs font-semibold underline shrink-0">
              Review
            </Link>
            <button
              type="button"
              onClick={() => dispatch(syncBannerDismissed())}
              className="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-amber-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        }
      />
    );
  }

  if (isComplete && sync.shiftCloseWarnings > 0) {
    return (
      <SyncStatusStrip
        icon={AlertTriangle}
        iconClass="text-amber-600"
        bgClass="bg-amber-50 border-amber-200 text-amber-900"
        message="Shift closed with unsynced items"
        actions={
          <>
            <Link to={ROUTES.SALES.HISTORY} className="text-xs font-semibold underline shrink-0">
              Review
            </Link>
            <button
              type="button"
              onClick={() => dispatch(syncBannerDismissed())}
              className="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-amber-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        }
      />
    );
  }

  return null;
}
