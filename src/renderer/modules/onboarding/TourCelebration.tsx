import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PartyPopper } from 'lucide-react';
import { MODAL_Z_INDEX_CLASS } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';

const FLOWERS = ['🌸', '🌺', '🌼', '🌻', '🌷', '🌹', '💮', '🏵️', '💐', '✨'];

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
}

function buildPetals(): Petal[] {
  return Array.from({ length: 48 }, (_, i) => ({
    id: i,
    emoji: FLOWERS[i % FLOWERS.length],
    left: (i * 17 + 11) % 100,
    delay: (i % 12) * 0.08,
    duration: 2.4 + (i % 7) * 0.28,
    size: 18 + (i % 9) * 2.2,
    drift: -40 + (i % 10) * 8,
  }));
}

export function TourCelebration({ open, onDone }: TourCelebrationProps) {
  const petals = useMemo(() => (open ? buildPetals() : []), [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} pointer-events-none`} aria-live="polite">
      <style>{`
        @keyframes custosell-petal-fall {
          0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(720deg); opacity: 0.15; }
        }
      `}</style>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 select-none"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animation: `custosell-petal-fall ${p.duration}s linear ${p.delay}s forwards`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="pointer-events-auto absolute inset-x-0 top-[28%] flex justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-indigo-200 bg-white/95 p-6 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg">
            <PartyPopper className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">You’re ready to run your business</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Congratulations — you’ve completed the Custosell tour. Explore your modules, invite your team,
            and grow with confidence. Replay anytime from Guide → Tour.
          </p>
          <Button className="mt-5 min-w-[10rem]" onClick={onDone}>
            Let’s go
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
