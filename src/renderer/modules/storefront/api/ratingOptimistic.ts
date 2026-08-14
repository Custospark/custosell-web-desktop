/** Recompute avg/count after an optimistic 1-5 star upsert. */
export function applyOptimisticRating(
  prevAvg: number,
  prevCount: number,
  prevMy: number | null | undefined,
  nextRating: number,
): { rating_avg: number; rating_count: number; my_rating: number } {
  const avg = Number(prevAvg) || 0;
  const count = Number(prevCount) || 0;
  const my = prevMy == null ? null : Number(prevMy);

  if (my != null && count > 0) {
    const sum = avg * count - my + nextRating;
    return {
      rating_avg: Math.round((sum / count) * 10) / 10,
      rating_count: count,
      my_rating: nextRating,
    };
  }

  const nextCount = count + 1;
  const sum = avg * count + nextRating;
  return {
    rating_avg: Math.round((sum / nextCount) * 10) / 10,
    rating_count: nextCount,
    my_rating: nextRating,
  };
}
