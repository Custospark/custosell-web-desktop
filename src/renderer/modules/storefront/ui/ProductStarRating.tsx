import { Star } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface ProductStarRatingProps {
  avg: number;
  count: number;
  myRating?: number | null;
  disabled?: boolean;
  onRate?: (stars: number) => void;
  className?: string;
}

/** Interactive 1–5 stars — tap to rate; shows average + count. */
export function ProductStarRating({
  avg,
  count,
  myRating,
  disabled,
  onRate,
  className,
}: ProductStarRatingProps) {
  const display = myRating ?? avg;
  const filled = Math.round(display);

  return (
    <div
      className={cn('flex flex-col gap-0.5', className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label={
        count > 0
          ? `Rated ${avg.toFixed(1)} out of 5 from ${count} reviews`
          : 'No ratings yet — tap a star to rate'
      }
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const isOn = n <= filled;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || !onRate}
              title={myRating ? `Your rating: ${myRating} — change to ${n}` : `Rate ${n} stars`}
              aria-label={`Rate ${n} stars`}
              aria-pressed={myRating === n}
              className={cn(
                'rounded p-0.5 transition hover:scale-110 disabled:cursor-wait disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRate?.(n);
              }}
            >
              <Star
                className={cn(
                  'h-3.5 w-3.5 sm:h-4 sm:w-4',
                  isOn ? 'fill-amber-400 text-amber-500' : 'fill-transparent text-slate-300',
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="text-[10px] font-medium tabular-nums text-slate-500">
        {count > 0 ? (
          <>
            {avg.toFixed(1)} · {count} {count === 1 ? 'review' : 'reviews'}
            {myRating ? ` · yours ${myRating}` : ''}
          </>
        ) : (
          <span className="text-slate-400">Tap stars to rate</span>
        )}
      </p>
    </div>
  );
}
