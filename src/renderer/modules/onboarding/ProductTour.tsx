import { useLayoutEffect, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Play, Pause } from 'lucide-react';
import { Button } from '../../shared/components/buttons/Button';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { useAppContext } from '../../app/contexts/AppContext';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { cn } from '../../shared/utils/cn';
import {
  placeTourCard,
  TOUR_CARET_SIZE,
  type CardPlacement,
  type SpotRect,
} from './tourCardPlacement';
import { measureTourTarget, measureTourTargetStable } from './tourTargetMeasure';
import { resolveTourSteps } from './productTourSteps';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface ProductTourProps {
  open: boolean;
  startStep?: number;
  onFinished?: () => void;
  onSkipped?: () => void;
}

const AUTO_PLAY_SECONDS = 5;
const LG_BREAKPOINT = 1024;

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
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const navigate = useNavigate();
  const update = useUpdateOnboarding();
  const steps = useMemo(() => resolveTourSteps(user), [user]);
  const [index, setIndex] = useState(() => Math.min(startStep, Math.max(0, steps.length - 1)));
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [viewportTick, setViewportTick] = useState(0);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(AUTO_PLAY_SECONDS);
  /** True once the current step’s spotlight attempt finished — autoplay waits on this. */
  const [stepReady, setStepReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const sidebarStateRef = useRef(appState);
  const focusGenRef = useRef(0);

  useEffect(() => {
    sidebarStateRef.current = appState;
  }, [appState]);

  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const isLast = index >= steps.length - 1;
  const StepIcon = step?.icon;

  const placement = useMemo(
    () => placeTourCard(spot, cardHeight),
    // viewportTick forces recompute on resize / orientation / visualViewport
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional viewport tick
    [spot, cardHeight, viewportTick],
  );

  /** Open/expand sidebar when spotlight is inside it; never toggle blindly. */
  function ensureSidebarForTarget(target: string): boolean {
    const needsSidebar = target.startsWith('sidebar-');
    const isLg = window.innerWidth >= LG_BREAKPOINT;
    const { sidebarCollapsed, sidebarOpen } = sidebarStateRef.current;

    if (needsSidebar) {
      if (isLg) {
        if (sidebarCollapsed) {
          appDispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: false });
        }
      } else if (!sidebarOpen) {
        appDispatch({ type: 'SET_SIDEBAR_OPEN', payload: true });
      }
      return true;
    }

    if (!isLg && sidebarOpen) {
      appDispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
    }
    return false;
  }

  useLayoutEffect(() => {
    if (!open || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear highlight when tour closes
      setSpot(null);
      setStepReady(false);
      return;
    }

    const gen = ++focusGenRef.current;
    setStepReady(false);

    async function focusStep() {
      // Paint a spotlight ASAP — refine after layout settles (keeps precision, feels instant)
      const quick = measureTourTarget(step.target);
      if (quick && gen === focusGenRef.current) setSpot(quick);

      const needsSidebar = ensureSidebarForTarget(step.target);
      if (needsSidebar || window.innerWidth < LG_BREAKPOINT) {
        await new Promise((r) => setTimeout(r, 120));
      }

      expandSidebarGroup(step.expandGroup);
      await new Promise((r) => setTimeout(r, 40));

      if (step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, 100));
        ensureSidebarForTarget(step.target);
        await new Promise((r) => setTimeout(r, 60));
        expandSidebarGroup(step.expandGroup);
      }

      if (gen !== focusGenRef.current) return;
      const measured = await measureTourTargetStable(step.target, { attempts: 6, settleMs: 20 });
      if (gen !== focusGenRef.current) return;
      setSpot(measured ?? quick);
      setStepReady(true);

      // Background refine after paint
      await new Promise((r) => setTimeout(r, 30));
      if (gen !== focusGenRef.current) return;
      const refined = measureTourTarget(step.target);
      if (refined) setSpot(refined);
    }

    void focusStep();

    const bump = () => {
      setViewportTick((n) => n + 1);
      const next = measureTourTarget(step.target);
      if (gen === focusGenRef.current && next) setSpot(next);
    };

    window.addEventListener('resize', bump);
    window.addEventListener('orientationchange', bump);
    window.visualViewport?.addEventListener('resize', bump);
    window.visualViewport?.addEventListener('scroll', bump);
    return () => {
      focusGenRef.current += 1;
      window.removeEventListener('resize', bump);
      window.removeEventListener('orientationchange', bump);
      window.visualViewport?.removeEventListener('resize', bump);
      window.visualViewport?.removeEventListener('scroll', bump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sidebar ensure reads refs; only re-focus on step/index
  }, [open, step, navigate, index]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const h = Math.round(cardRef.current.getBoundingClientRect().height);
    if (h > 0 && h !== cardHeight) {
      setCardHeight(h);
    }
  }, [open, step, index, placement.width, cardHeight, viewportTick]);

  const fireSave = useCallback((action: string, tourStep?: number) => {
    update.mutate({ action, tour_step: tourStep } as never, {
      onError: () => { /* background save — errors are non-blocking */ },
    });
  }, [update]);

  const goNext = useCallback(() => {
    if (isLast) {
      setAutoPlay(false);
      onFinished?.();
      fireSave('complete_tour');
      return;
    }
    const next = index + 1;
    setIndex(next);
    fireSave('tour_step', next);
  }, [isLast, index, onFinished, fireSave]);

  const goNextRef = useRef(goNext);
  useLayoutEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  function goBack() {
    if (index <= 0) return;
    setAutoPlay(false);
    const prev = index - 1;
    setIndex(prev);
    fireSave('tour_step', prev);
  }

  function skipTour() {
    setAutoPlay(false);
    onSkipped?.();
    fireSave('skip_tour');
  }

  function toggleAutoPlay() {
    setAutoPlay((p) => !p);
  }

  // Auto-play: after each step is ready, count down then call Next — repeats for every step
  useEffect(() => {
    if (!autoPlay || !open || !stepReady) return;

    let remaining = AUTO_PLAY_SECONDS;
    queueMicrotask(() => setAutoCountdown(remaining));

    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setAutoCountdown(0);
        goNextRef.current();
        return;
      }
      setAutoCountdown(remaining);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [autoPlay, open, stepReady, index]);

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
                rx="10"
                fill="black"
              />
            ) : null}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask="url(#custosell-tour-mask)" />
      </svg>
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-[10px] ring-2 ring-indigo-400 ring-inset shadow-[0_0_0_1px_rgba(129,140,248,0.45),0_0_24px_rgba(99,102,241,0.35)]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxSizing: 'border-box',
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-sm font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => skipTour()}
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={toggleAutoPlay}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    autoPlay ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={autoPlay ? 'Pause auto-play' : `Auto-play every ${AUTO_PLAY_SECONDS}s`}
                >
                  {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {autoPlay ? (stepReady ? `${autoCountdown}s` : '…') : 'Auto Play'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={index <= 0} onClick={() => goBack()}>
                  Back
                </Button>
                <Button size="sm" onClick={() => goNext()}>
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
