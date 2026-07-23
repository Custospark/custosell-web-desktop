import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/PlanCards';
import { useInitiateOnboardingPayment, useBillingPayment } from '../../shared/api/account/AccountQueries';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { CreditCard, Smartphone, CheckCircle, ArrowRight, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const subscription = user?.business?.subscription;
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);

  const { data: plans, isLoading: plansLoading } = useActivePlans();
  const plan = plans?.find((p) => p.id === subscription?.plan_id);

  const initiateMutation = useInitiateOnboardingPayment();
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);

  useEffect(() => {
    if (!user || !subscription) {
      navigate(ROUTES.REGISTER, { replace: true });
      return;
    }
    if (subscription.onboarding_fee_paid) {
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

  const onboardingFee = plan?.onboarding_fee_ugx || 0;
  const userPhone = user?.business?.phone || user?.phone || '';
  const isPaymentDone = paymentQuery.data?.status === 'completed';

  const handlePay = () => {
    if (!onboardingFee) return;

    initiateMutation.mutate(
      { amount: Number(onboardingFee), currency: 'UGX', phone: userPhone },
      {
        onSuccess: (result) => {
          setPaymentId(result.payment_id);
          setInitiated(true);
        },
      }
    );
  };

  const handleRetry = () => {
    setPaymentId(null);
    setInitiated(false);
  };

  if (!user || !subscription) return null;

  return (
    <AuthLayout
      title="Complete Onboarding Payment"
      subtitle="Pay the one-time setup fee to activate your plan"
      heroImage={AUTH_HERO_IMAGES.register}
    >
      <div className="space-y-6">
        {plansLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {plan && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Selected Plan</span>
              <span className="text-lg font-bold text-gray-900">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between border-t border-blue-100 pt-3">
              <span className="text-sm text-gray-600">Onboarding Fee</span>
              <span className="text-lg font-bold text-amber-600">
                {Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(onboardingFee))}
              </span>
            </div>
            {plan.trial_days ? (
              <div className="bg-blue-100/50 rounded-lg px-3 py-2 text-center">
                <span className="text-xs font-semibold text-blue-700">
                  {plan.trial_days}-day trial period starts after payment
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Smartphone className="w-4 h-4 text-gray-400" />
            Mobile Money Number
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {userPhone || 'No phone on file'}
          </p>
          <p className="text-xs text-gray-400">
            An STK push will be sent to this number. Ensure it is registered on mobile money.
          </p>
        </div>

        {!initiated && !isPaymentDone && (
          <Button
            type="button"
            onClick={handlePay}
            className="w-full gap-2 py-3.5 text-base"
            loading={initiateMutation.isPending}
            disabled={!onboardingFee || !userPhone}
          >
            <CreditCard className="h-4 w-4" />
            Pay Onboarding Fee
          </Button>
        )}

        {initiateMutation.isError && !initiated && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{initiateMutation.error?.message || 'Payment initiation failed. Please try again.'}</span>
          </div>
        )}

        {initiated && !isPaymentDone && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <div>
                <p className="font-semibold text-amber-800">Check your phone</p>
                <p className="text-sm text-amber-600 mt-1">
                  An STK push has been sent to <strong>{userPhone}</strong>. Enter your mobile money PIN to complete payment.
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
                  <span>Payment was not completed. Please try again.</span>
                </div>
                <Button type="button" onClick={handleRetry} variant="outline" className="w-full gap-2">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}

        {isPaymentDone && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-600">
                Your plan is now active{plan?.trial_days ? `. Your ${plan.trial_days}-day trial period has started.` : '.'}
              </p>
              {redirectCountdown > 0 && (
                <p className="text-xs text-green-500">Redirecting to dashboard in {redirectCountdown}s...</p>
              )}
            </div>
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
