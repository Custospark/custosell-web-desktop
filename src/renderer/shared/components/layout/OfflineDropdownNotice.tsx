import { WifiOff } from 'lucide-react';

/** Shown inside a header dropdown when its data needs an internet connection. */
export function OfflineDropdownNotice() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4 text-sm text-amber-800">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <span>This needs an internet connection. Reconnect to load the latest info.</span>
    </div>
  );
}
