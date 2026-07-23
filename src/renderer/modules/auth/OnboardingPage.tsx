import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans, PlanCards } from '../../shared/components/plans/PlanCards';
import { useSubscribe, useInitiateOnboardingPayment, useBillingPayment } from '../../shared/api/account/AccountQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { SUBSCRIPTIONS } from '../../shared/api/endpoints/endpoints';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { CreditCard, Loader2, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const subscription = user?.business?.subscription;
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(subscription?.plan_id ?? null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [subscribing, setSubscribing] = useState(false);

  const { data: plans } = useActivePlans();
  const subscribeMutation = useSubscribe();
  const initiateMutation = useInitiateOnboardingPayment();
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
  const onboardingFee = selectedPlan?.onboarding_fee_ugx || 0;
  const userPhone = user?.business?.phone || user?.phone || '';
  const isPaymentDone = paymentQuery.data?.status === 'completed';

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.REGISTER, { replace: true });
      return;
    }
    if (subscription?.onboarding_fee_paid) {
      navigate(getDefaultRoute(user), { replace: true });
    }
  }, []);

  useEffect(() => {
    if (paymentQuery.data?.status === 'completed') {
      setRedirectCountdown(3);
    }
  }, [paymentQuery.data?.status]);

  useEffect(() => {
    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown((c) => c - 1);
      }, 1000);
      if (redirectCountdown === 1) {
        navigate(getDefaultRoute(user));
      }
      return () => clearTimeout(timer);
    }
  }, [redirectCountdown]);

  const handleStartPayment = async () => {
    if (!selectedPlanId || !onboardingFee || !user) return;

    setSubscribing(true);

    try {
      if (!subscription) {
        await subscribeMutation.mutateAsync({ plan_id: selectedPlanId, billing_cycle: billingCycle });
      } else if (subscription.plan_id !== selectedPlanId) {
        await axiosInstance.post(SUBSCRIPTIONS.UPGRADE(subscription.id), {
          to_plan_id: selectedPlanId,
          effective: 'immediate',
        });
      }

      initiateMutation.mutate(
        { amount: Number(onboardingFee), currency: 'UGX', phone: userPhone },
        { onSuccess: (result) => { setPaymentId(result.payment_id); setInitiated(true); } }
      );
    } catch {
    } finally {
      setSubscribing(false);
    }
  };

  if (!user) return null;

  if (isPaymentDone) {
    return (
      <AuthLayout title="Payment Successful" subtitle="" heroImage={AUTH_HERO_IMAGES.register}>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="font-semibold text-green-800">Payment Successful!</p>
          <p className="text-sm text-green-600">
            {selectedPlan?.trial_days
              ? `Your ${selectedPlan.trial_days}-day trial period has started.`
              : 'Your plan is now active.'}
          </p>
          {redirectCountdown > 0 && (
            <p className="text-xs text-green-500">Redirecting to dashboard in {redirectCountdown}s...</p>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose Your Plan"
      subtitle="Select a plan and pay the one-time setup fee to get started."
      heroImage={AUTH_HERO_IMAGES.register}
    >
      <div className="space-y-6">
        <PlanCards
          plans={plans ?? []}
          selectedPlanId={selectedPlanId}
          onSelect={(plan) => setSelectedPlanId(plan.id)}
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
          hideTrialBadge
        />

        {selectedPlanId && !initiated && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">One-time setup fee</span>
              <span className="text-lg font-bold text-amber-600">
                {Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(onboardingFee))}
              </span>
            </div>
            {selectedPlan?.trial_days ? (
              <div className="bg-blue-100/50 rounded-lg px-3 py-2 text-center">
                <span className="text-xs font-semibold text-blue-700">
                  {selectedPlan.trial_days}-day trial period starts after payment
                </span>
              </div>
            ) : null}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-sm text-gray-600">Mobile Money: <strong>{userPhone || 'No phone on file'}</strong></p>
              <p className="text-xs text-gray-400 mt-1">An STK push will be sent to this number.</p>
            </div>
          </div>
        )}

        {selectedPlanId && !initiated && (
          <Button
            type="button"
            onClick={handleStartPayment}
            className="w-full gap-2 py-3.5 text-base"
            loading={subscribing || initiateMutation.isPending}
            disabled={!onboardingFee || !userPhone}
          >
            <CreditCard className="h-4 w-4" />
            Pay Onboarding Fee
          </Button>
        )}

        {initiateMutation.isError && !initiated && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{initiateMutation.error?.message || 'Payment initiation failed.'}</span>
          </div>
        )}

        {initiated && !isPaymentDone && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <div>
                <p className="font-semibold text-amber-800">Check your phone</p>
                <p className="text-sm text-amber-600 mt-1">
                  An STK push has been sent to <strong>{userPhone}</strong>. Enter your PIN to complete payment.
                </p>
              </div>
            </div>
            {paymentQuery.isFetching && (
              <p className="text-center text-xs text-gray-400">Waiting for payment confirmation...</p>
            )}
            {paymentQuery.data?.status === 'failed' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Payment was not completed.</span>
                </div>
                <Button type="button" onClick={() => { setPaymentId(null); setInitiated(false); }} variant="outline" className="w-full gap-2">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {!initiated && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate(ROUTES.REGISTER)}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to registration
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
