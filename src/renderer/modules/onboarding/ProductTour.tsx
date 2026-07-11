import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/buttons/Button';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import { resolveTourSteps } from './productTourSteps';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface ProductTourProps {
  open: boolean;
  startStep?: number;
}

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTourTarget(target: string): SpotRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - 6,
    left: rect.left - 6,
    width: rect.width + 12,
    height: rect.height + 12,
  };
}

export function ProductTour({ open, startStep = 0 }: ProductTourProps) {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const update = useUpdateOnboarding();
  const steps = useMemo(() => resolveTourSteps(user), [user]);
  const [index, setIndex] = useState(() => Math.min(startStep, Math.max(0, steps.length - 1)));
  const [spot, setSpot] = useState<SpotRect | null>(null);

  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const isLast = index >= steps.length - 1;

  useLayoutEffect(() => {
    if (!open || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear highlight when tour closes
      setSpot(null);
      return;
    }

    let cancelled = false;

    async function focusStep() {
      if (step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, 180));
      }
      if (cancelled) return;
      setSpot(measureTourTarget(step.target));
    }

    void focusStep();
    const onResize = () => setSpot(measureTourTarget(step.target));
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [open, step, navigate, index]);

  if (!open || !step || steps.length === 0 || typeof document === 'undefined') return null;

  async function finish(kind: 'complete_tour' | 'skip_tour') {
    await update.mutateAsync({ action: kind });
  }

  async function goNext() {
    if (isLast) {
      await finish('complete_tour');
      return;
    }
    const next = index + 1;
    setIndex(next);
    await update.mutateAsync({ action: 'tour_step', tour_step: next });
  }

  async function goBack() {
    if (index <= 0) return;
    const prev = index - 1;
    setIndex(prev);
    await update.mutateAsync({ action: 'tour_step', tour_step: prev });
  }

  const cardStyle: CSSProperties = spot
    ? {
        top: Math.min(window.innerHeight - 220, Math.max(16, spot.top + spot.height + 12)),
        left: Math.min(window.innerWidth - 360, Math.max(16, spot.left)),
      }
    : { top: '30%', left: '50%', transform: 'translateX(-50%)' };

  return createPortal(
    <div className={cn('fixed inset-0', MODAL_Z_INDEX_CLASS)} role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute inset-0 bg-slate-900/45" />
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}
      <div
        className="absolute w-[min(100%-2rem,22rem)] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl"
        style={cardStyle}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          Product tour · Step {index + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
            disabled={update.isPending}
            onClick={() => void finish('skip_tour')}
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={index <= 0 || update.isPending} onClick={() => void goBack()}>
              Back
            </Button>
            <Button size="sm" disabled={update.isPending} loading={update.isPending} onClick={() => void goNext()}>
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
