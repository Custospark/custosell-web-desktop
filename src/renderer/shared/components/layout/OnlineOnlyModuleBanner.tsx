import { WifiOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface OnlineOnlyModuleBannerProps {
  title?: string;
  message: string;
  className?: string;
}

/** In-page notice when the user is already on an online-only route while offline. */
export function OnlineOnlyModuleBanner({
  title = 'Requires connection',
  message,
  className,
}: OnlineOnlyModuleBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
        className,
      )}
      role="status"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-amber-800">{message}</p>
      </div>
    </div>
  );
}
