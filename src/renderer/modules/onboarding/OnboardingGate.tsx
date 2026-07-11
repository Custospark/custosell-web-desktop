import { useCallback, useEffect, useState } from 'react';
import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { IntentOnboardingModal } from './IntentOnboardingModal';
import { ProductTour } from './ProductTour';
import { TourCelebration } from './TourCelebration';
import { useOnboardingState } from './useOnboardingQueries';

const INTENT_DELAY_MS = 5_000;

/** Mounts with intent closed, then opens after a short settle delay. */
function DelayedIntentModal() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), INTENT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return <IntentOnboardingModal open={ready} />;
}

/** Owner intent + product tour after auth. Does not change module access. */
export function OnboardingGate() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const userId = useAppSelector((s) => s.auth.user?.id);
  const { isCompletelyOffline } = useNetworkStatus();
  const { data } = useOnboardingState(isAuthenticated && !isCompletelyOffline);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateReason, setCelebrateReason] = useState<'completed' | 'skipped'>('completed');

  const closeCelebration = useCallback(() => setCelebrate(false), []);
  const openCelebration = useCallback((reason: 'completed' | 'skipped') => {
    setCelebrateReason(reason);
    setCelebrate(true);
  }, []);

  if (!isAuthenticated || isCompletelyOffline || !data) {
    return celebrate
      ? (
        <TourCelebration
          key={`celebrate-${celebrateReason}`}
          open
          reason={celebrateReason}
          onDone={closeCelebration}
        />
      )
      : null;
  }

  const showIntent = Boolean(data.needs_intent);
  const showTour = !data.needs_intent && data.needs_tour;

  return (
    <>
      {showIntent ? <DelayedIntentModal key={`intent-${userId ?? 'anon'}`} /> : null}
      <ProductTour
        // Stable while the tour is open — keying on tour_step remounted and killed Auto Play
        key={showTour ? `tour-active-${userId ?? 'anon'}` : 'tour-off'}
        open={showTour}
        startStep={data.tour_step ?? 0}
        onFinished={() => openCelebration('completed')}
        onSkipped={() => openCelebration('skipped')}
      />
      <TourCelebration
        key={celebrate ? `celebrate-${celebrateReason}` : 'celebrate-off'}
        open={celebrate}
        reason={celebrateReason}
        onDone={closeCelebration}
      />
    </>
  );
}
