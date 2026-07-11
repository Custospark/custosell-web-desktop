import { useNetworkStatus } from '../../app/store/hooks/useNetworkStatus';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { IntentOnboardingModal } from './IntentOnboardingModal';
import { ProductTour } from './ProductTour';
import { useOnboardingState } from './useOnboardingQueries';

/** Owner intent + product tour after auth. Does not change module access. */
export function OnboardingGate() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { isCompletelyOffline } = useNetworkStatus();
  const { data } = useOnboardingState(isAuthenticated && !isCompletelyOffline);

  if (!isAuthenticated || isCompletelyOffline || !data) return null;

  const showIntent = data.needs_intent;
  const showTour = !showIntent && data.needs_tour;

  return (
    <>
      <IntentOnboardingModal open={showIntent} />
      <ProductTour
        key={showTour ? `tour-${data.tour_step ?? 0}` : 'tour-off'}
        open={showTour}
        startStep={data.tour_step ?? 0}
      />
    </>
  );
}
