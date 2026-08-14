import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import {
  dismissOfflineBanner,
  selectShowOfflineBanner,
} from '../../../app/store/slices/networkSlice';
import { WifiOff, X } from 'lucide-react';
import {
  buildOfflineBannerHeadline,
  OFFLINE_BANNER_REASSURANCE,
} from './offlineBannerCopy';

/** Full-width offline notice - sits above the layout shell, never overlays the header. */
export function OfflineBanner() {
  const dispatch = useAppDispatch();
  const showBanner = useAppSelector(selectShowOfflineBanner);
  const fullName = useAppSelector((s) => s.auth.user?.name);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className="relative z-40 flex shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold">{buildOfflineBannerHeadline(fullName)}</span>
        <span className="hidden text-amber-400 sm:inline">·</span>
        <span className="text-amber-800">{OFFLINE_BANNER_REASSURANCE}</span>
      </div>
      <button
        type="button"
        title="Dismiss offline notice"
        aria-label="Dismiss offline notice"
        onClick={() => dispatch(dismissOfflineBanner())}
        className="shrink-0 rounded-md p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-800"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
