import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';

const STEPS = [
  {
    title: 'Pick your columns',
    body: 'Select the Kanban columns you want metrics scoped to. Every chart and target uses at least one column.',
  },
  {
    title: 'Set planning horizons',
    body: 'When adding targets, choose a planning level from year down to day. We decompose expectations automatically.',
  },
  {
    title: 'Track expected vs actual',
    body: 'Trend charts show a dashed expected pace line from your decomposition plan so you can spot drift early.',
  },
  {
    title: 'Check My progress',
    body: 'Switch to My progress to see personal allocations, pace alerts, and column activity.',
  },
];

interface ProgressWalkthroughProps {
  boardId: number;
}

function storageKey(boardId: number): string {
  return `custosell-progress-walkthrough-${boardId}`;
}

export default function ProgressWalkthrough({ boardId }: ProgressWalkthroughProps) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey(boardId)) !== 'done';
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
      localStorage.setItem(storageKey(boardId), 'done');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-white/55 bg-white/85 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Progress walkthrough · Step {step + 1} of {STEPS.length}
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
