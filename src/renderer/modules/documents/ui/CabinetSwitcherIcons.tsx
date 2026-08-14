import { ArrowLeftRight, Maximize2, Minimize2, Plus, Settings } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface CabinetSwitcherIconsProps {
  onOpenAll: () => void;
  onOpenSettings?: () => void;
  onCreateNew: () => void;
  allowSettings?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

export default function CabinetSwitcherIcons({
  onOpenAll,
  onOpenSettings,
  onCreateNew,
  allowSettings = false,
  isFullscreen = false,
  onToggleFullscreen,
  className,
}: CabinetSwitcherIconsProps) {
  return (
    <div
      className={cn(
        'relative z-30 flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-white/40 bg-white/85 px-3 py-2.5 backdrop-blur-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenAll}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border-2 border-indigo-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
          'bg-gradient-to-r from-indigo-50 via-white to-blue-50 text-indigo-800',
          'hover:border-indigo-400 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md hover:shadow-indigo-200/50',
          'active:scale-[0.98]',
        )}
        title="Switch cabinets"
        aria-label="Switch cabinets"
      >
        <ArrowLeftRight className="h-4 w-4 text-indigo-600" />
        <span className="hidden sm:inline">Switch cabinets</span>
      </button>
      {allowSettings && onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 border-amber-300/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
            'bg-gradient-to-r from-amber-50 via-white to-orange-50 text-amber-900',
            'hover:border-amber-400 hover:from-amber-100 hover:to-orange-100 hover:shadow-md hover:shadow-amber-200/50',
            'active:scale-[0.98]',
          )}
          title="Cabinet settings"
          aria-label="Cabinet settings"
        >
          <Settings className="h-4 w-4 text-amber-700" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      )}
      <button
        type="button"
        onClick={onCreateNew}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-violet-400/90 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all',
          'bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 text-violet-800',
          'hover:border-violet-500 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md hover:shadow-violet-200/50',
          'active:scale-[0.98]',
        )}
        title="New cabinet"
        aria-label="New cabinet"
      >
        <Plus className="h-4 w-4 text-violet-600" />
        <span className="hidden sm:inline">New cabinet</span>
      </button>
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]',
            isFullscreen
              ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-white to-orange-50 text-amber-900 hover:border-amber-500 hover:shadow-md hover:shadow-amber-200/50'
              : 'border-blue-300/90 bg-gradient-to-r from-blue-50 via-white to-indigo-50 text-blue-800 hover:border-blue-400 hover:shadow-md hover:shadow-blue-200/50',
          )}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-amber-700" /> : <Maximize2 className="h-4 w-4 text-blue-600" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      )}
    </div>
  );
}
