import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../utils/cn';
import ModuleLauncherModal from './ModuleLauncherModal';

const iconBtn =
  'inline-flex items-center justify-center shrink-0 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors';

export function ModuleLauncherButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="navbar-apps"
        className={cn(iconBtn, 'h-8 w-8 xl:h-9 xl:w-auto xl:min-w-[2rem] xl:gap-1.5 xl:px-2.5')}
        title="Switch modules"
        aria-label="Switch modules"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xl:inline truncate text-xs font-medium xl:text-sm">Apps</span>
      </button>
      <ModuleLauncherModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
