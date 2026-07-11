import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/buttons/Button';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import {
  placeTourCard,
  TOUR_CARET_SIZE,
  type CardPlacement,
  type SpotRect,
} from './tourCardPlacement';
import {
  filterStepsWithTargets,
  resolveTourSteps,
  type ProductTourStep,
} from './productTourSteps';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface ProductTourProps {
  open: boolean;
  startStep?: number;
  onFinished?: () => void;
  onSkipped?: () => void;
}

const PAD = 4;

function measureTourTarget(target: string): SpotRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el || el.getClientRects().length === 0) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 && rect.height < 2) return null;
  return {
    top: Math.round(rect.top) - PAD,
    left: Math.round(rect.left) - PAD,
    width: Math.round(Math.max(rect.width + PAD * 2, 32)),
    height: Math.round(Math.max(rect.height + PAD * 2, 32)),
  };
}

async function measureWithRetry(target: string, attempts = 6): Promise<SpotRect | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const spot = measureTourTarget(target);
    if (spot) return spot;
    await new Promise((r) => setTimeout(r, 60 + i * 40));
  }
  return null;
}

function expandSidebarGroup(label?: string) {
  if (!label) return;
  const buttons = Array.from(document.querySelectorAll('aside nav button'));
  for (const btn of buttons) {
    const text = (btn.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text.includes(label)) continue;
    if (btn.getAttribute('aria-expanded') !== 'true') {
      (btn as HTMLButtonElement).click();
    }
    break;
  }
}

function TourCaret({ placement }: { placement: CardPlacement }) {
  const size = TOUR_CARET_SIZE;
  if (placement.side === 'center') return null;

  const base = 'pointer-events-none absolute h-0 w-0 border-solid';
  if (placement.side === 'bottom') {
    return (
      <span
        aria-hidden
        className={cn(base, 'border-x-transparent border-b-white')}
        style={{
          top: -size,
          left: placement.caretAlong - size,
          borderWidth: `0 ${size}px ${size}px ${size}px`,
          filter: 'drop-shadow(0 -1px 0 rgb(199 210 254))',
        }}
      />
    );
  }
  if (placement.side === 'top') {
    return (
      <span
        aria-hidden
        className={cn(base, 'border-x-transparent border-t-white')}
        style={{
          bottom: -size,
          left: placement.caretAlong - size,
          borderWidth: `${size}px ${size}px 0 ${size}px`,
          filter: 'drop-shadow(0 1px 0 rgb(199 210 254))',
        }}
      />
    );
  }
  if (placement.side === 'right') {
    return (
      <span
        aria-hidden
        className={cn(base, 'border-y-transparent border-r-white')}
        style={{
          left: -size,
          top: placement.caretAlong - size,
          borderWidth: `${size}px ${size}px ${size}px 0`,
          filter: 'drop-shadow(-1px 0 0 rgb(199 210 254))',
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(base, 'border-y-transparent border-l-white')}
      style={{
        right: -size,
        top: placement.caretAlong - size,
        borderWidth: `${size}px 0 ${size}px ${size}px`,
        filter: 'drop-shadow(1px 0 0 rgb(199 210 254))',
      }}
    />
  );
}

export function ProductTour({ open, startStep = 0, onFinished, onSkipped }: ProductTourProps) {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const update = useUpdateOnboarding();
  const baseSteps = useMemo(() => resolveTourSteps(user), [user]);
  const [steps, setSteps] = useState<ProductTourStep[]>(baseSteps);
  const [index, setIndex] = useState(() => Math.min(startStep, Math.max(0, baseSteps.length - 1)));
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const isLast = index >= steps.length - 1;
  const StepIcon = step?.icon;

  const placement = useMemo(
    () => placeTourCard(spot, cardHeight),
    // viewportTick forces recompute on resize / orientation / visualViewport
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional viewport tick
    [spot, cardHeight, viewportTick],
  );

  useLayoutEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when closed
      setSpot(null);
      return;
    }

    let cancelled = false;

    async function prepare() {
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled) return;
      const available = filterStepsWithTargets(baseSteps);
      const nextSteps = available.length > 0 ? available : baseSteps;
      setSteps(nextSteps);
      setIndex((prev) => Math.min(prev, Math.max(0, nextSteps.length - 1)));
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [open, baseSteps]);

  useLayoutEffect(() => {
    if (!open || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear highlight when tour closes
      setSpot(null);
      return;
    }

    let cancelled = false;

    async function focusStep() {
      expandSidebarGroup(step.expandGroup);
      await new Promise((r) => setTimeout(r, 100));
      if (step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, 240));
      }
      if (cancelled) return;
      const measured = await measureWithRetry(step.target);
      if (!cancelled) setSpot(measured);
    }

    void focusStep();

    const bump = () => {
      setViewportTick((n) => n + 1);
      void measureWithRetry(step.target, 3).then((m) => {
        if (!cancelled) setSpot(m);
      });
    };

    window.addEventListener('resize', bump);
    window.addEventListener('orientationchange', bump);
    window.visualViewport?.addEventListener('resize', bump);
    window.visualViewport?.addEventListener('scroll', bump);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', bump);
      window.removeEventListener('orientationchange', bump);
      window.visualViewport?.removeEventListener('resize', bump);
      window.visualViewport?.removeEventListener('scroll', bump);
    };
  }, [open, step, navigate, index]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const h = Math.round(cardRef.current.getBoundingClientRect().height);
    if (h > 0 && h !== cardHeight) {
      setCardHeight(h);
    }
  }, [open, step, index, placement.width, cardHeight, viewportTick]);

  async function persistFinish(kind: 'complete_tour' | 'skip_tour') {
    await update.mutateAsync({ action: kind });
  }

  async function goNext() {
    if (isLast) {
      onFinished?.();
      await persistFinish('complete_tour');
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

  async function skipTour() {
    onSkipped?.();
    await persistFinish('skip_tour');
  }

  if (!open || !step || steps.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className={cn('fixed inset-0', MODAL_Z_INDEX_CLASS)} role="dialog" aria-modal="true" aria-label="Product tour">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="custosell-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot ? (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="14"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask="url(#custosell-tour-mask)" />
      </svg>
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-indigo-400 shadow-[0_0_0_1px_rgba(129,140,248,0.5),0_0_28px_rgba(99,102,241,0.4)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        className="absolute z-10 overflow-visible rounded-2xl border border-indigo-200/80 bg-white shadow-2xl"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
          maxWidth: 'calc(100vw - 1.5rem)',
        }}
      >
        <TourCaret placement={placement} />
        <div className="overflow-hidden rounded-2xl">
          <div className="flex items-start gap-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/90 to-white px-3.5 py-3 sm:px-4 sm:py-3.5">
            {StepIcon ? (
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-11 sm:w-11', step.tone ?? 'bg-indigo-50 text-indigo-600 ring-indigo-100')}>
                <StepIcon className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                Guided tour · {index + 1} / {steps.length}
              </p>
              <h3 className="mt-0.5 text-[0.95rem] font-semibold leading-snug text-slate-900 sm:text-base">
                {step.title}
              </h3>
            </div>
          </div>
          <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 sm:mt-4">
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
                disabled={update.isPending}
                onClick={() => void skipTour()}
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
