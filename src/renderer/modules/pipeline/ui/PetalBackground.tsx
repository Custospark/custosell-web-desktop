import { useMemo } from 'react';

const FLOWERS = ['🌸', '🌺', '🌼', '🌻', '🌷', '🌹', '💮', '🏵️', '💐', '🌸', '🌺'];

export default function PetalBackground() {
  const petals = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: FLOWERS[i % FLOWERS.length],
      left: (i * 17 + 3) % 100,
      delay: (i % 15) * 0.4,
      duration: 8 + (i % 7) * 2,
      size: 16 + (i % 8) * 4,
      opacity: 0.12 + (i % 6) * 0.03,
    })),
  []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute animate-[custosell-petal-float_linear_infinite]"
          style={{
            left: `${p.left}%`,
            top: '-5%',
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <style>{`
        @keyframes custosell-petal-float {
          0%   { transform: translate3d(0,-8vh,0) rotate(0deg); }
          50%  { transform: translate3d(var(--drift,30px), 50vh, 0) rotate(360deg); }
          100% { transform: translate3d(calc(var(--drift,30px) * -1), 108vh, 0) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}
