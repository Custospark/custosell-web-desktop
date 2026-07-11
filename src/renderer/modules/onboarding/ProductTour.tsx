import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/buttons/Button';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
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

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_W = 360;
const CARD_H = 230;
const GAP = 16;
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

function placeCardAwayFromSpot(spot: SpotRect | null): CSSProperties {
  if (!spot) {
    return { bottom: 28, left: '50%', transform: 'translateX(-50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const candidates: Array<{ top: number; left: number; score: number }> = [
    { top: spot.top + spot.height + GAP, left: spot.left, score: 5 },
    { top: spot.top - CARD_H - GAP, left: spot.left, score: 4 },
    { top: spot.top, left: spot.left + spot.width + GAP, score: 3 },
    { top: spot.top, left: spot.left - CARD_W - GAP, score: 2 },
    { top: vh - CARD_H - 28, left: (vw - CARD_W) / 2, score: 1 },
  ];

  const ranked = candidates
    .map((c) => ({
      ...c,
      top: Math.min(vh - CARD_H - 12, Math.max(12, c.top)),
      left: Math.min(vw - CARD_W - 12, Math.max(12, c.left)),
    }))
    .map((c) => {
      const overlaps =
        c.left < spot.left + spot.width + 10
        && c.left + CARD_W > spot.left - 10
        && c.top < spot.top + spot.height + 10
        && c.top + CARD_H > spot.top - 10;
      return { ...c, score: overlaps ? c.score - 20 : c.score };
    })
    .sort((a, b) => b.score - a.score);

  return { top: ranked[0].top, left: ranked[0].left };
}

export function ProductTour({ open, startStep = 0, onFinished, onSkipped }: ProductTourProps) {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const update = useUpdateOnboarding();
  const baseSteps = useMemo(() => resolveTourSteps(user), [user]);
  const [steps, setSteps] = useState<ProductTourStep[]>(baseSteps);
  const [index, setIndex] = useState(() => Math.min(startStep, Math.max(0, baseSteps.length - 1)));
  const [spot, setSpot] = useState<SpotRect | null>(null);

  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const isLast = index >= steps.length - 1;
  const StepIcon = step?.icon;

  useLayoutEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when closed
      setSpot(null);
      return;
    }

    let cancelled = false;

    async function prepare() {
      // Wait a beat for sidebar/nav to paint, then drop missing targets
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
    const onResize = () => {
      void measureWithRetry(step.target, 3).then((m) => {
        if (!cancelled) setSpot(m);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [open, step, navigate, index]);

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

  const cardStyle = placeCardAwayFromSpot(spot);

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
          className="pointer-events-none absolute rounded-2xl ring-2 ring-indigo-400 shadow-[0_0_0_1px_rgba(129,140,248,0.5),0_0_24px_rgba(99,102,241,0.35)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}
      <div
        className="absolute z-10 w-[min(100%-1.5rem,22.5rem)] overflow-hidden rounded-2xl border border-indigo-200/80 bg-white shadow-2xl"
        style={cardStyle}
      >
        <div className="flex items-start gap-3 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/90 to-white px-4 py-3.5">
          {StepIcon ? (
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', step.tone ?? 'bg-indigo-50 text-indigo-600 ring-indigo-100')}>
              <StepIcon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              Guided tour · {index + 1} / {steps.length}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">{step.title}</h3>
          </div>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
    </div>,
    document.body,
  );
}
