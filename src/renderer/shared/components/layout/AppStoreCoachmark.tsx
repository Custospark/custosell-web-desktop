import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, X } from 'lucide-react';
import {
  COACHMARK_SHOW_DELAY_MS,
  COACHMARK_TARGET_SELECTOR,
  isTipDue,
  readTipSeen,
  stampTipSeen,
} from './appsTipStore';

const EDGE_MARGIN = 8;

interface Anchor {
  top: number;
  left: number;
  arrowLeft: number;
}

function measureAnchor(): Anchor | null {
  const target = document.querySelector(COACHMARK_TARGET_SELECTOR);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0 && rect.top === 0 && rect.left === 0) {
    return null;
  }
  const bubbleWidth = Math.min(300, window.innerWidth - EDGE_MARGIN * 2);
  const left = Math.max(
    EDGE_MARGIN,
    Math.min(rect.right - bubbleWidth, window.innerWidth - bubbleWidth - EDGE_MARGIN),
  );
  const buttonCenter = rect.left + rect.width / 2;
  return {
    top: rect.bottom + 10,
    left,
    arrowLeft: Math.max(16, Math.min(buttonCenter - left, bubbleWidth - 16)),
  };
}

interface AppStoreCoachmarkProps {
  userId: number | string | null | undefined;
  firstName?: string | null;
  /** Hide while onboarding intent/tour is active - the welcome flow owns attention then. */
  onboardingActive: boolean;
  /** Hide while the store itself is open. */
  paused: boolean;
  onOpenStore: () => void;
}

/**
 * One-tip spotlight pointing at the header Custosell Apps button.
 * Shows once per app version, then retires on any dismissal - click away,
 * Escape, or Got it all count. "Show me" opens the store.
 */
export function AppStoreCoachmark({
  userId,
  firstName,
  onboardingActive,
  paused,
  onOpenStore,
}: AppStoreCoachmarkProps) {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId || onboardingActive || paused) {
      return;
    }
    if (!isTipDue(readTipSeen(userId))) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (!document.querySelector(COACHMARK_TARGET_SELECTOR)) return;
      stampTipSeen(userId);
      setVisible(true);
    }, COACHMARK_SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [userId, onboardingActive, paused]);

  useEffect(() => {
    if (!paused) {
      return;
    }
    queueMicrotask(() => {
      setVisible(false);
    });
  }, [paused]);

  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    const update = () => {
      if (!disposed) setAnchor(measureAnchor());
    };
    queueMicrotask(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const onPointerDown = (event: PointerEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node | null)) {
        setVisible(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVisible(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      disposed = true;
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  if (typeof document === 'undefined' || !visible) return null;

  const greeting = firstName ? `${firstName}, all` : 'All';

  return createPortal(
    <div
      ref={bubbleRef}
      role="dialog"
      aria-label="Custosell Apps tip"
      className="fixed z-[100] w-[300px] max-w-[calc(100vw-16px)]"
      style={anchor ? { top: anchor.top, left: anchor.left } : { top: 64, right: 8 }}
    >
      {anchor && (
        <span
          aria-hidden
          className="absolute -top-[7px] h-3.5 w-3.5 rotate-45 border-l border-t border-indigo-100 bg-white"
          style={{ left: anchor.arrowLeft }}
        />
      )}
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-500/15">
        <div className="flex items-start gap-2.5 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30">
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Your apps live here</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {greeting} your apps are here - pick what you need, hide what you don&apos;t.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Got it"
            title="Got it"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              onOpenStore();
            }}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Show me
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
