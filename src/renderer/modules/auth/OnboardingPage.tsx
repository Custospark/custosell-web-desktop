import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { PlanCards } from '../../shared/components/plans/PlanCards';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useSubscribe, useInitiateOnboardingPayment, useBillingPayment, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { axiosInstance } from '../../app/api/axiosConfig';
import { BILLING } from '../../shared/api/endpoints/endpoints';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import PaymentPhoneField from '../../shared/components/inputs/PaymentPhoneField';
import { isValidPaymentPhone } from '../../shared/utils/phoneNumber';
import { useDisplayPrices } from '../../shared/utils/useDisplayPrices';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { CreditCard, Loader2, CheckCircle, AlertCircle, X, Home, Wallet, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { useReferralEarnings, useApplyReferralCode } from '../../modules/referral/api/useReferralQueries';
import type { ReferralRecord } from '../../modules/referral/api/ReferralTypes';
import { PaymentDoneScreen, WaitingScreen, FailedScreen } from './OnboardingStatusScreens';
import { useLogoutAction } from '../../app/contexts/useLogoutActions';
import { usePaymentPopup } from '../../shared/hooks/usePaymentPopup';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const subscription = user?.business?.subscription;
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(subscription?.plan_id ?? null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeSuccess, setPromoCodeSuccess] = useState<string | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [appliedReferral, setAppliedReferral] = useState<ReferralRecord | null>(null);
  const applyReferralMutation = useApplyReferralCode();
  const { logout } = useLogoutAction();
  const userPhone = user?.business?.phone || user?.phone || '';
  const [phone, setPhone] = useState<string | undefined>(userPhone || undefined);

  const handleHome = () => {
    void logout(ROUTES.HOME);
  };

  const { currency, onboardingFee, usdOnboardingFee, exchangeRate } = useDisplayPrices();
  const { data: earnings } = useReferralEarnings();
  const { data: plans, isLoading: plansLoading } = useActivePlans();
  const businessPlans = plans?.filter((p) => p.type !== 'personal') ?? [];
  const availableCredit = earnings?.business_credit ?? 0;
  const referral = appliedReferral ?? subscription?.referral;
  const selectedPlanForDiscount = businessPlans.find((p) => p.id === selectedPlanId);
  const referralDiscountUsd = (() => {
    if (!referral) return 0;
    const base = selectedPlanForDiscount ? usdOnboardingFee(selectedPlanForDiscount) : 0;
    if (referral.discount_type === 'percentage') {
      return Math.round((base * Number(referral.discount_value ?? 0)) / 100 * 100) / 100;
    }
    if (referral.discount_type === 'free_month') {
      return base;
    }
    return Number(referral.discount_applied ?? 0);
  })();
  const subscribeMutation = useSubscribe();
  const initiateMutation = useInitiateOnboardingPayment();
  const paymentQuery = useBillingPayment(initiated ? paymentId : null);
  const { refetch: refetchProfile, isRefetching } = useProfile();

  const { environment, popupBlocked, paymentUrl, openedExternally, openPaymentPopup, redirectPaymentWindow, closePaymentPopup } = usePaymentPopup();

  useEffect(() => closePaymentPopup, [closePaymentPopup]);

  const selectedPlan = businessPlans.find((p) => p.id === selectedPlanId);
  const fee = selectedPlan ? onboardingFee(selectedPlan) : 0;
  const feeUsd = selectedPlan ? usdOnboardingFee(selectedPlan) : 0;
  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';
  const isPaymentFailed = paymentQuery.data?.data?.status === 'failed';
  const paymentCurrency = getPaymentCurrency();
  const canPayLocal = paymentCurrency !== 'USD' && exchangeRate !== null;
  const referralDiscountConverted = referralDiscountUsd > 0 && canPayLocal && exchangeRate !== null
    ? Math.round(referralDiscountUsd * exchangeRate * 100) / 100
    : referralDiscountUsd;
  const creditConverted = canPayLocal && availableCredit > 0 && exchangeRate !== null
    ? Math.round(availableCredit * exchangeRate * 100) / 100
    : availableCredit;
  const displayFee = canPayLocal ? fee : feeUsd;
  const totalDue = Math.max(0, displayFee - referralDiscountConverted - creditConverted);
  const displayCurrency = canPayLocal ? currency : 'USD';

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.REGISTER, { replace: true });
      return;
    }
    if (subscription?.onboarding_fee_paid) {
      navigate(getDefaultRoute(user), { replace: true });
    }
  }, [user, subscription, navigate]);

  useEffect(() => {
    if (paymentQuery.data?.data?.status === 'completed') {
      refetchProfile();
    }
  }, [paymentQuery.data?.data?.status, refetchProfile]);

  const handleContinue = async () => {
    const profile = await refetchProfile();
    navigate(getDefaultRoute(profile.data ?? user));
  };

  const handleSelectPlan = (plan: { id: number }) => {
    setSelectedPlanId(plan.id);
    setShowModal(true);
  };

  const handleStartPayment = async () => {
    if (!selectedPlanId || !fee || !user) return;

    setSubscribing(true);
    // Open the popup synchronously inside the click gesture so browsers don't
    // block it. We navigate it to the gateway URL once initiate returns.
    openPaymentPopup();

    try {
      if (!subscription) {
        await subscribeMutation.mutateAsync({ plan_id: selectedPlanId, billing_cycle: billingCycle });
      }

      const paymentCurrency = getPaymentCurrency();
      const canPayLocal = paymentCurrency !== 'USD' && exchangeRate !== null;
      const paymentAmount = canPayLocal
        ? Math.round(Number(feeUsd) * exchangeRate! * 100) / 100
        : Number(feeUsd);
      const effectiveCurrency = canPayLocal ? paymentCurrency : 'USD';
      const metadata = { action: 'subscribe', plan_id: selectedPlanId };

      initiateMutation.mutate(
        { amount: paymentAmount, currency: effectiveCurrency, phone, metadata },
        {
          onSuccess: (result) => {
            setPaymentId(result.payment_id);
            setInitiated(true);
            setShowModal(false);
            if (result.redirect_url) {
              redirectPaymentWindow(result.redirect_url);
            } else {
              closePaymentPopup();
            }
          },
          onError: () => {
            closePaymentPopup();
            setSubscribing(false);
          },
        },
      );
    } catch {
      closePaymentPopup();
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
    return <PaymentDoneScreen handleContinue={handleContinue} isRefetching={isRefetching} selectedPlan={selectedPlan} />;
  }

  if (initiated && !isPaymentDone && !isPaymentFailed) {
    return (
      <WaitingScreen
        handleVerifyPayment={handleVerifyPayment}
        verifying={verifying}
        popupBlocked={popupBlocked}
        paymentUrl={paymentUrl}
        openedExternally={openedExternally}
        environment={environment}
        phone={phone}
        verifyMessage={verifyMessage}
        onReset={() => { closePaymentPopup(); setPaymentId(null); setInitiated(false); setVerifyMessage(null); }}
      />
    );
  }

  if (isPaymentFailed) {
    return <FailedScreen onReset={() => { closePaymentPopup(); setPaymentId(null); setInitiated(false); }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <button
          type="button"
          onClick={handleHome}
          className="inline-flex items-center gap-2.5 cursor-pointer"
          aria-label="Home"
        >
          <LogoImage size="md" />
          <span className="text-xl font-bold text-blue-600">{PRODUCT_NAME}</span>
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleHome}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            aria-label="Home"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </button>
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
              plans={businessPlans}
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
                {formatCurrency(Number(displayFee), displayCurrency)}
              </p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">One-time setup fee</p>
            </div>

            {referral?.code && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-700">
                    Promo code <span className="font-mono">{referral.code}</span> applied
                  </span>
                </div>
                <p className="text-xs text-indigo-600/80 pl-6">
                  {referral.discount_type === 'percentage'
                    ? `${referral.discount_value}% off your subscription for ${referral.discount_duration_months ?? 0} month${(referral.discount_duration_months ?? 0) > 1 ? 's' : ''}`
                    : referral.discount_type === 'free_month'
                      ? 'One month free on your subscription'
                      : 'Discount applied to your subscription'}
                </p>
              </div>
            )}

            {(referralDiscountUsd > 0 || availableCredit > 0) && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Onboarding fee</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(Number(displayFee), displayCurrency)}</span>
                </div>
                {referralDiscountUsd > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-green-700 font-medium">
                      <Tag className="w-4 h-4 text-green-600" />
                      Promo discount
                    </span>
                    <span className="font-bold text-green-700">
                      -{formatCurrency(referralDiscountConverted, displayCurrency)}
                      {canPayLocal && (
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (${referralDiscountUsd.toFixed(2)} USD)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {availableCredit > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-green-700 font-medium">
                      <Wallet className="w-4 h-4 text-green-600" />
                      Credit applied
                    </span>
                    <span className="font-bold text-green-700">
                      -{formatCurrency(creditConverted, displayCurrency)}
                      {canPayLocal && (
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (${availableCredit.toFixed(2)} USD)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-green-200 pt-1.5">
                  <span className="text-sm font-semibold text-gray-800">Total due today</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(totalDue, displayCurrency)}</span>
                </div>
              </div>
            )}

            {selectedPlan.trial_days ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                <p className="text-sm font-semibold text-blue-700">
                  {selectedPlan.trial_days}-day trial period starts after payment
                </p>
              </div>
            ) : null}

            <PaymentPhoneField
              initialPhone={userPhone}
              onChange={setPhone}
              label="Mobile Money number"
            />

            {!referral?.code && !promoCodeSuccess && (
              <div className="border-t border-gray-100 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPromoInput((v) => !v)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    Have a promo or referral code?
                  </span>
                  {showPromoInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showPromoInput && (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (promoCodeInput.trim()) {
                          setPromoCodeSuccess(null);
                          applyReferralMutation.mutate(
                            { referral_code: promoCodeInput.trim() },
                            {
                              onSuccess: (data) => {
                                setAppliedReferral(data?.referral ?? null);
                                const num = Number(data?.referral?.discount_applied ?? 0);
                                setPromoCodeSuccess(
                                  num > 0 ? '$' + num.toFixed(2) + ' discount applied' : 'Code applied successfully'
                                );
                                setPromoCodeInput('');
                                setShowPromoInput(false);
                              },
                            },
                          );
                        }
                      }}
                      disabled={!promoCodeInput.trim() || applyReferralMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {applyReferralMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}
                {applyReferralMutation.isError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {applyReferralMutation.error?.response?.data?.message || 'Failed to apply code'}
                  </p>
                )}
              </div>
            )}

            {promoCodeSuccess && (
              <div className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                {promoCodeSuccess}
              </div>
            )}

            <Button
              type="button"
              onClick={handleStartPayment}
              className="w-full gap-2 py-3 text-sm"
              loading={subscribing || initiateMutation.isPending}
              disabled={!fee || !isValidPaymentPhone(phone)}
            >
              <CreditCard className="w-4 h-4" />
              Pay Onboarding Fee
            </Button>

            {initiateMutation.isError && !initiated && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{initiateMutation.error?.response?.data?.message || 'Payment initiation failed.'}</span>
              </div>
            )}

            {initiated && (
              <div className="text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-sm font-medium text-amber-800">Check your phone</p>
                <p className="text-xs text-amber-600">
                  Enter your PIN on <strong>{phone}</strong> to complete payment.
                </p>
                {paymentQuery.data?.data?.status === 'failed' && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-red-600">Payment was not completed.</p>
                    <Button type="button" onClick={() => { closePaymentPopup(); setPaymentId(null); setInitiated(false); }} variant="outline" size="sm">
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
