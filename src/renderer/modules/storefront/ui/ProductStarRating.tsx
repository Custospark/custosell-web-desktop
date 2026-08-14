import { Star } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface ProductStarRatingProps {
  avg: number;
  count: number;
  myRating?: number | null;
  onRate?: (stars: number) => void;
  /** Extra disable (e.g. mutation pending). */
  disabled?: boolean;
  className?: string;
}

/** Interactive 1-5 stars - tap to rate; shows average + count. */
export function ProductStarRating({
  avg,
  count,
  myRating,
  onRate,
  disabled = false,
  className,
}: ProductStarRatingProps) {
  const display = myRating ?? avg;
  const filled = Math.round(display);
  const locked = !onRate || disabled;

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
          : 'No ratings yet - tap a star to rate'
      }
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const isOn = n <= filled;
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              title={myRating ? `Your rating: ${myRating} - change to ${n}` : `Rate ${n} stars`}
              aria-label={`Rate ${n} stars`}
              aria-pressed={myRating === n}
              className={cn(
                'rounded p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (locked) return;
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
          <span className="text-slate-400">{onRate ? 'Tap stars to rate' : 'No ratings yet'}</span>
        )}
      </p>
    </div>
  );
}
