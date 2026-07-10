import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';

const STEPS = [
  {
    title: 'Organize with cabinets',
    body: 'Cabinets group folders and files by team or function — like HR, Finance, or Operations. We seed common starters you can rename anytime.',
  },
  {
    title: 'Open a cabinet',
    body: 'Click a cabinet card to open its explorer. Upload, create folders, search, and preview files — all scoped to that cabinet.',
  },
  {
    title: 'Cabinet settings',
    body: 'Managers can open Cabinet settings to rename the cabinet, choose who has access, and customize the canvas background for that space.',
  },
  {
    title: 'Switch anytime',
    body: 'Inside a cabinet, use the name dropdown in the header to jump to another cabinet or create a new one.',
  },
];

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

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(), 'done');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Business files walkthrough · Step {step + 1} of {STEPS.length}
          </p>
          <h3 className="mt-1 text-sm font-bold text-gray-900">{current.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{current.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded p-1 text-gray-400 hover:bg-white/60 hover:text-gray-600"
          aria-label="Dismiss walkthrough"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={dismiss} className="text-xs text-gray-500 hover:text-gray-700">
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
  );
}
