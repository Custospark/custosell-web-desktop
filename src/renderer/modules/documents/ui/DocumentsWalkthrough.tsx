import { useState } from 'react';
import {
  Archive,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';

const STEPS = [
  {
    title: 'Organize with cabinets',
    body: 'Cabinets group folders and files by team or function - like HR, Finance, or Operations. Starter cabinets are ready to rename.',
    icon: LayoutGrid,
    tone: 'indigo',
  },
  {
    title: 'Open a cabinet',
    body: 'Click any cabinet card to browse folders, upload files, search, and preview documents inside that space.',
    icon: FolderOpen,
    tone: 'violet',
  },
  {
    title: 'Cabinet settings',
    body: 'Use Settings in the bottom toolbar to rename the cabinet, manage access, and customize the canvas background.',
    icon: Settings,
    tone: 'sky',
  },
  {
    title: 'Switch anytime',
    body: 'Inside a cabinet, use the header dropdown to jump between cabinets or create a new one without losing your place.',
    icon: Archive,
    tone: 'emerald',
  },
] as const;

const TONE_STYLES = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
} as const;

function storageKey(): string {
  return 'custosell-documents-walkthrough';
}

export default function DocumentsWalkthrough() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey()) !== 'done';
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step >= STEPS.length - 1;
  const StepIcon = current.icon;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(), 'done');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 shadow-sm">
      <div className="border-b border-indigo-100/80 bg-white/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" />
          Quick tour · Step {step + 1} of {STEPS.length}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
            TONE_STYLES[current.tone],
          )}
        >
          <StepIcon className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{current.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{current.body}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/80 hover:text-gray-600"
              aria-label="Dismiss walkthrough"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-indigo-200',
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Skip tour
              </button>
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) dismiss();
                  else setStep((s) => s + 1);
                }}
                className="inline-flex items-center gap-1"
              >
                {isLast ? 'Got it' : 'Next'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
