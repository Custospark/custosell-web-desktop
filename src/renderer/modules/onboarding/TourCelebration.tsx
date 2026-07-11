import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PartyPopper } from 'lucide-react';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';

const FLOWERS = ['🌸', '🌺', '🌼', '🌻', '🌷', '🌹', '💮', '🏵️', '💐', '✨', '🌸', '🌺'];
const CELEBRATION_MS = 30_000;

interface Petal {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

interface TourCelebrationProps {
  open: boolean;
  onDone: () => void;
  /** completed | skipped — copy only */
  reason?: 'completed' | 'skipped';
}

function buildPetals(): Petal[] {
  return Array.from({ length: 72 }, (_, i) => ({
    id: i,
    emoji: FLOWERS[i % FLOWERS.length],
    left: (i * 13 + 7) % 100,
    delay: (i % 20) * 0.12,
    duration: 3.2 + (i % 9) * 0.35,
    size: 20 + (i % 10) * 2.4,
    drift: -50 + (i % 12) * 9,
  }));
}

export function TourCelebration({ open, onDone, reason = 'completed' }: TourCelebrationProps) {
  const petals = useMemo(() => (open ? buildPetals() : []), [open]);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!open) return;
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((CELEBRATION_MS - (Date.now() - started)) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(tick);
        onDone();
      }
    }, 250);
    const auto = window.setTimeout(() => onDone(), CELEBRATION_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(auto);
    };
  }, [open, onDone]);

  if (!open || typeof document === 'undefined') return null;

  const title = reason === 'skipped'
    ? 'You’re set — welcome to Custosell'
    : 'You’re ready to run your business';
  const body = reason === 'skipped'
    ? 'No worries for skipping the tour. Your workspace is ready — explore at your pace, and replay the tour anytime from Guide → Tour.'
    : 'Congratulations — you’ve completed the Custosell tour. Explore your modules, invite your team, and grow with confidence. Replay anytime from Guide → Tour.';

  return createPortal(
    <div className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} pointer-events-none`} aria-live="polite">
      <style>{`
        @keyframes custosell-petal-fall {
          0% { transform: translate3d(0,-12vh,0) rotate(0deg) scale(0.8); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 115vh, 0) rotate(900deg) scale(1.05); opacity: 0.1; }
        }
      `}</style>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 select-none will-change-transform"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animation: `custosell-petal-fall ${p.duration}s linear ${p.delay}s infinite`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="pointer-events-auto absolute inset-x-0 top-[26%] flex justify-center px-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-indigo-200/80 bg-white/95 text-center shadow-2xl backdrop-blur-md">
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 px-6 py-5 text-white">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40 backdrop-blur">
              <PartyPopper className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">{title}</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-slate-600">{body}</p>
            <p className="mt-3 text-xs font-medium text-indigo-600">
              Enjoy the moment · closing in {secondsLeft}s
            </p>
            <Button className="mt-4 min-w-[10rem]" onClick={onDone}>
              Let’s go
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
