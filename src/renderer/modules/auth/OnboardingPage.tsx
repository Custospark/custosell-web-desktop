import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { PlanCards } from '../../shared/components/plans/PlanCards';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useSubscribe, useInitiateOnboardingPayment, useBillingPayment } from '../../shared/api/account/SubscriptionQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { BILLING, SUBSCRIPTIONS } from '../../shared/api/endpoints/endpoints';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { CreditCard, Loader2, CheckCircle, AlertCircle, X, Home, ArrowRight } from 'lucide-react';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';

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
  const [verifying, setVerifying] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { data: plans, isLoading: plansLoading } = useActivePlans();
  const subscribeMutation = useSubscribe();
  const initiateMutation = useInitiateOnboardingPayment();
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);
  const { refetch: refetchProfile } = useProfile();

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
  const onboardingFee = selectedPlan?.onboarding_fee_ugx || 0;
  const userPhone = user?.business?.phone || user?.phone || '';
  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';
  const isPaymentFailed = paymentQuery.data?.data?.status === 'failed';

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
    if (paymentQuery.data?.data?.status === 'completed') {
      refetchProfile().then(() => setRedirectCountdown(10));
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

  const handleSelectPlan = (plan: { id: number }) => {
    setSelectedPlanId(plan.id);
    setShowModal(true);
  };

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
        {
          onSuccess: (result) => {
            setPaymentId(result.payment_id);
            setInitiated(true);
            setShowModal(false);
            if (result.redirect_url) {
              window.open(result.redirect_url, '_blank');
            }
          },
        }
      );
    } catch { /* keep previous state */ } finally {
      setSubscribing(false);
    }
  };

  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const handleVerifyPayment = async () => {
    if (!paymentId) return;
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const { data } = await axiosInstance.post(BILLING.CONFIRM(paymentId));
      if (data.success) {
        paymentQuery.refetch();
      } else {
        setVerifyMessage(data.message || 'Payment not yet confirmed.');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setVerifyMessage(apiErr?.response?.data?.message || 'Could not verify payment. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (!user) return null;

  if (isPaymentDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
            <LogoImage size="md" />
            <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Payment Successful!</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedPlan?.trial_days
                  ? `Your ${selectedPlan.trial_days}-day trial period has started.`
                  : 'Your plan is now active.'}
              </p>
            </div>
            {redirectCountdown > 0 && (
              <p className="text-xs text-gray-400">Redirecting to dashboard in {redirectCountdown}s...</p>
            )}
            <button
              type="button"
              onClick={() => navigate(getDefaultRoute(user))}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (initiated && !isPaymentDone && !isPaymentFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
            <LogoImage size="md" />
            <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-5">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
            <div>
              <p className="text-lg font-bold text-gray-900">Waiting for Payment</p>
              <p className="text-sm text-gray-500 mt-1">
                Complete your payment in the opened window.
              </p>
            </div>
            <button
              type="button"
              onClick={handleVerifyPayment}
              disabled={verifying}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {verifying ? 'Verifying...' : "I've Completed Payment — Verify"}
            </button>
            {verifyMessage && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{verifyMessage}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setPaymentId(null); setInitiated(false); setVerifyMessage(null); }}
              className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
            >
              Cancel and try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isPaymentFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
          <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
            <LogoImage size="md" />
            <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Payment Failed</p>
              <p className="text-sm text-gray-500 mt-1">
                Your payment could not be processed. Please try again or contact support.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setPaymentId(null); setInitiated(false); }}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Again
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <Link to={ROUTES.HOME} className="inline-flex items-center gap-2.5">
          <LogoImage size="md" />
          <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
        </Link>
        <div className="ml-auto">
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            aria-label="Home"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
            <p className="text-gray-500">Select a plan to continue with the one-time setup fee.</p>
          </div>

          {plansLoading ? (
            <CustosellLoader fullPage={false} />
          ) : (
            <PlanCards
              plans={plans ?? []}
              selectedPlanId={selectedPlanId}
              onSelect={handleSelectPlan}
              billingCycle={billingCycle}
              onBillingCycleChange={setBillingCycle}
              hideTrialBadge
            />
          )}
        </div>
      </main>

      {showModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">{selectedPlan.name}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(Number(onboardingFee))}
              </p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">One-time setup fee</p>
            </div>

            {selectedPlan.trial_days ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                <p className="text-sm font-semibold text-blue-700">
                  {selectedPlan.trial_days}-day trial period starts after payment
                </p>
              </div>
            ) : null}

            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-sm text-gray-600">
                Mobile Money: <span className="font-semibold text-gray-900">{userPhone || 'No phone on file'}</span>
              </p>
              <p className="text-xs text-gray-400">An STK push will be sent to this number.</p>
            </div>

            <Button
              type="button"
              onClick={handleStartPayment}
              className="w-full gap-2 py-3 text-sm"
              loading={subscribing || initiateMutation.isPending}
              disabled={!onboardingFee || !userPhone}
            >
              <CreditCard className="w-4 h-4" />
              Pay Onboarding Fee
            </Button>

            {initiateMutation.isError && !initiated && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{initiateMutation.error?.message || 'Payment initiation failed.'}</span>
              </div>
            )}

            {initiated && (
              <div className="text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-sm font-medium text-amber-800">Check your phone</p>
                <p className="text-xs text-amber-600">
                  Enter your PIN on <strong>{userPhone}</strong> to complete payment.
                </p>
                {paymentQuery.data?.data?.status === 'failed' && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-red-600">Payment was not completed.</p>
                    <Button type="button" onClick={() => { setPaymentId(null); setInitiated(false); }} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
