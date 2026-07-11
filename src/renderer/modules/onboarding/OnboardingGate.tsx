import { useState } from 'react';
import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { IntentOnboardingModal } from './IntentOnboardingModal';
import { ProductTour } from './ProductTour';
import { TourCelebration } from './TourCelebration';
import { useOnboardingState } from './useOnboardingQueries';

/** Owner intent + product tour after auth. Does not change module access. */
export function OnboardingGate() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { isCompletelyOffline } = useNetworkStatus();
  const { data } = useOnboardingState(isAuthenticated && !isCompletelyOffline);
  const [celebrate, setCelebrate] = useState(false);

  if (!isAuthenticated || isCompletelyOffline || !data) {
    return celebrate ? <TourCelebration open onDone={() => setCelebrate(false)} /> : null;
  }

  const showIntent = data.needs_intent;
  const showTour = !showIntent && data.needs_tour;

  return (
    <>
      <IntentOnboardingModal open={showIntent} />
      <ProductTour
        key={showTour ? `tour-${data.tour_step ?? 0}` : 'tour-off'}
        open={showTour}
        startStep={data.tour_step ?? 0}
        onFinished={() => setCelebrate(true)}
      />
      <TourCelebration open={celebrate} onDone={() => setCelebrate(false)} />
    </>
  );
}
