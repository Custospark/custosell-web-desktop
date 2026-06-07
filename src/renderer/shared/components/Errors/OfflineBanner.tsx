import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  dismissOfflineBanner,
  selectShowOfflineBanner,
} from '../../../app/store/slices/networkSlice';
import { WifiOff, X } from 'lucide-react';

/** Full-width offline notice — sits above the layout shell, never overlays the header. */
export function OfflineBanner() {
  const dispatch = useAppDispatch();
  const showBanner = useAppSelector(selectShowOfflineBanner);
  const userName = useAppSelector((s) => s.auth.user?.name);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className="relative z-40 flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm text-red-700 shrink-0"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-red-500" aria-hidden />
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium">
          {userName ? `${userName}, you're offline` : "You're offline"}
        </span>
        <span className="text-red-400 hidden sm:inline">·</span>
        <span className="text-red-600">
          Sales will be saved locally and synced when reconnected.
        </span>
      </div>
      <button
        type="button"
        title="Dismiss offline notice"
        aria-label="Dismiss offline notice"
        onClick={() => dispatch(dismissOfflineBanner())}
        className="shrink-0 p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
