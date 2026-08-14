import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { PROGRESS_PERIOD_OPTIONS, type ProgressPeriod } from '../../pipeline/api/pipelineProgressTerms';
import { TALENT_SURFACE } from './talentSurface';
import {
  ClipboardCheck,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { TalentTab } from './talentTabType';

interface HrTalentHeroProps {
  tab: TalentTab;
  onSelectTab: (tab: TalentTab) => void;
  period: ProgressPeriod;
  onSelectPeriod: (period: ProgressPeriod) => void;
  customFrom: string;
  customTo: string;
  onSetCustomRange: (from: string, to: string) => void;
  isFullHr: boolean;
  pendingOnboarding: number;
  draftReviews: number;
  visibleTaskCount: number;
  reviewsCount: number;
  onOpenTemplate: () => void;
  onOpenTask: () => void;
  onOpenReview: () => void;
}

export default function HrTalentHero({
  tab,
  onSelectTab,
  period,
  onSelectPeriod,
  customFrom,
  customTo,
  onSetCustomRange,
  isFullHr,
  pendingOnboarding,
  draftReviews,
  visibleTaskCount,
  reviewsCount,
  onOpenTemplate,
  onOpenTask,
  onOpenReview,
}: HrTalentHeroProps) {
  return (
    <div className={TALENT_SURFACE.hero}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
            <h1 className={cn('text-xl font-bold', TALENT_SURFACE.textTitle)}>Talent</h1>
          </div>
          <p className={cn('mt-1 max-w-2xl text-sm', TALENT_SURFACE.textBody)}>
            {isFullHr
              ? 'Evaluate goal pace from Pipeline & Projects, guide onboarding, and run performance reviews - the same frosted Progress experience, for people.'
              : 'Your onboarding checklist and personal work progress from boards and projects.'}
          </p>
        </div>

        {isFullHr ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenTemplate}
              className="inline-flex items-center gap-1.5 border-white/60 bg-white/80 backdrop-blur-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Template
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenTask}
              className="inline-flex items-center gap-1.5 border-white/60 bg-white/80 backdrop-blur-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Task
            </Button>
            <Button size="sm" onClick={onOpenReview} className="inline-flex items-center gap-1.5 shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Review
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/40 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={TALENT_SURFACE.chipGroup}>
            {PROGRESS_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectPeriod(option.value)}
                className={cn(TALENT_SURFACE.chip, period === option.value && TALENT_SURFACE.chipActive)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' ? (
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onSetCustomRange(e.target.value, customTo)}
              className={TALENT_SURFACE.input}
              aria-label="From date"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => onSetCustomRange(customFrom, e.target.value)}
              className={TALENT_SURFACE.input}
              aria-label="To date"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={TALENT_SURFACE.chipGroup}>
            <button
              type="button"
              onClick={() => onSelectTab('performance')}
              className={cn(TALENT_SURFACE.chip, tab === 'performance' && TALENT_SURFACE.chipActive)}
            >
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {isFullHr ? 'Work performance' : 'My progress'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('onboarding')}
              className={cn(TALENT_SURFACE.chip, tab === 'onboarding' && TALENT_SURFACE.chipActive)}
            >
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Onboarding
                {pendingOnboarding > 0 ? (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    tab === 'onboarding' ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700',
                  )}>
                    {pendingOnboarding}
                  </span>
                ) : null}
              </span>
            </button>
            {isFullHr ? (
              <button
                type="button"
                onClick={() => onSelectTab('reviews')}
                className={cn(TALENT_SURFACE.chip, tab === 'reviews' && TALENT_SURFACE.chipActive)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Reviews
                  {draftReviews > 0 ? (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      tab === 'reviews' ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700',
                    )}>
                      {draftReviews}
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
            <span className="rounded-lg border border-white/50 bg-white/70 px-2.5 py-1 backdrop-blur-sm">
              {visibleTaskCount} onboarding task{visibleTaskCount === 1 ? '' : 's'}
            </span>
            {isFullHr ? (
              <span className="rounded-lg border border-white/50 bg-white/70 px-2.5 py-1 backdrop-blur-sm">
                {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
