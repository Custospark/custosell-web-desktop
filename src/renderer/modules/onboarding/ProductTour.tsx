import { useLayoutEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/buttons/Button';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import { resolveTourSteps, type ProductTourStep } from './productTourSteps';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface ProductTourProps {
  open: boolean;
  startStep?: number;
  onFinished?: () => void;
}

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_W = 340;
const CARD_H = 200;
const GAP = 14;

function measureTourTarget(target: string): SpotRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - 6,
    left: rect.left - 6,
    width: Math.max(rect.width + 12, 36),
    height: Math.max(rect.height + 12, 36),
  };
}

function expandSidebarGroup(label?: string) {
  if (!label) return;
  const buttons = document.querySelectorAll('aside nav button');
  buttons.forEach((btn) => {
    if (btn.textContent?.includes(label)) {
      const expanded = btn.getAttribute('aria-expanded');
      // Click only if it looks collapsed (chevron-right context) — best-effort
      if (expanded !== 'true') {
        (btn as HTMLButtonElement).click();
      }
    }
  });
}

/** Place the guide card so it never covers the highlighted target. */
function placeCardAwayFromSpot(spot: SpotRect | null): CSSProperties {
  if (!spot) {
    return { bottom: 24, left: '50%', transform: 'translateX(-50%)' };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const candidates: Array<{ top: number; left: number; score: number }> = [
    // below
    { top: spot.top + spot.height + GAP, left: spot.left, score: 4 },
    // above
    { top: spot.top - CARD_H - GAP, left: spot.left, score: 3 },
    // right
    { top: spot.top, left: spot.left + spot.width + GAP, score: 2 },
    // left
    { top: spot.top, left: spot.left - CARD_W - GAP, score: 1 },
    // bottom center fallback
    { top: vh - CARD_H - 24, left: (vw - CARD_W) / 2, score: 0 },
  ];

  const ranked = candidates
    .map((c) => ({
      ...c,
      top: Math.min(vh - CARD_H - 12, Math.max(12, c.top)),
      left: Math.min(vw - CARD_W - 12, Math.max(12, c.left)),
    }))
    .map((c) => {
      const overlaps =
        c.left < spot.left + spot.width + 8
        && c.left + CARD_W > spot.left - 8
        && c.top < spot.top + spot.height + 8
        && c.top + CARD_H > spot.top - 8;
      return { ...c, score: overlaps ? c.score - 10 : c.score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return { top: best.top, left: best.left };
}

export function ProductTour({ open, startStep = 0, onFinished }: ProductTourProps) {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const update = useUpdateOnboarding();
  const steps = useMemo(() => resolveTourSteps(user), [user]);
  const [index, setIndex] = useState(() => Math.min(startStep, Math.max(0, steps.length - 1)));
  const [spot, setSpot] = useState<SpotRect | null>(null);

  const step: ProductTourStep | undefined = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const isLast = index >= steps.length - 1;

  useLayoutEffect(() => {
    if (!open || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear highlight when tour closes
      setSpot(null);
      return;
    }

    let cancelled = false;

    async function focusStep() {
      expandSidebarGroup(step.expandGroup);
      if (step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, 220));
      }
      await new Promise((r) => setTimeout(r, 80));
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
    await persistFinish('skip_tour');
  }

  if (!open || !step || steps.length === 0 || typeof document === 'undefined') return null;

  const cardStyle = placeCardAwayFromSpot(spot);

  return createPortal(
    <div className={cn('fixed inset-0', MODAL_Z_INDEX_CLASS)} role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim with a real cutout so the target stays visible and unblocked by the card */}
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
                rx="12"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15,23,42,0.5)" mask="url(#custosell-tour-mask)" />
      </svg>
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
          }}
        />
      ) : null}
      <div
        className="absolute z-10 w-[min(100%-1.5rem,21.25rem)] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl"
        style={cardStyle}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          Guided tour · Step {index + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
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
    </div>,
    document.body,
  );
}
