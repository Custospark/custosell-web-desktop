import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { cn } from '../../../shared/utils/cn';
import { ReviewStatusBadge } from './HrStatusBadges';
import { TALENT_SURFACE } from './talentSurface';
import { employeeDisplayName, type HrReview, type ReviewStatus } from '../api/hrTypes';
import { Plus, Star } from 'lucide-react';

interface HrReviewsTabProps {
  reviews: HrReview[];
  loadingReviews: boolean;
  updateReviewPending: boolean;
  onOpenReview: () => void;
  onUpdateReview: (id: number, status: ReviewStatus) => void;
}

export default function HrReviewsTab({
  reviews,
  loadingReviews,
  updateReviewPending,
  onOpenReview,
  onUpdateReview,
}: HrReviewsTabProps) {
  return (
    <div className={TALENT_SURFACE.panel}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-violet-600" />
          <h4 className={cn('text-sm font-semibold', TALENT_SURFACE.textTitle)}>Performance reviews</h4>
        </div>
        <Button size="sm" onClick={onOpenReview} className="shadow-sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> Review
        </Button>
      </div>

      {loadingReviews ? (
        <div className="flex justify-center py-10"><CustosellLoader /></div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-slate-600 shadow-sm">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold', TALENT_SURFACE.textTitle)}>No reviews yet</h3>
            <p className={cn('mt-1.5 max-w-md text-sm', TALENT_SURFACE.textMuted)}>
              Start with a draft - or seed one from Work performance after evaluating Pipeline/Projects goals.
            </p>
          </div>
          <Button size="sm" onClick={onOpenReview}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Create a review
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className={TALENT_SURFACE.rowCard}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', TALENT_SURFACE.textTitle)}>
                    {review.employee ? employeeDisplayName(review.employee) : `#${review.employee_id}`}
                  </p>
                  <p className={cn('text-xs', TALENT_SURFACE.textMuted)}>
                    {review.period_label}
                    {review.rating != null ? ` · rating ${review.rating}/5` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ReviewStatusBadge status={review.status} />
                  <select
                    value={review.status}
                    disabled={updateReviewPending}
                    onChange={(e) => onUpdateReview(review.id, e.target.value as ReviewStatus)}
                    className="rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-xs text-slate-800 shadow-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              {review.rating != null ? (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Rating</span>
                    <span className="font-semibold text-gray-800">{review.rating}/5</span>
                  </div>
                  <div className={TALENT_SURFACE.barTrack}>
                    <div
                      className={TALENT_SURFACE.barFill}
                      style={{ width: `${Math.min(100, (Number(review.rating) / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
