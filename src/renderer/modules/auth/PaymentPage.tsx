import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { useActivePlans } from '../../shared/components/plans/useActivePlans';
import { useProfile } from '../../shared/api/account/AccountQueries';
import { useInitiateOnboardingPayment, useBillingPayment, getPaymentCurrency } from '../../shared/api/account/SubscriptionQueries';
import { getDefaultRoute } from '../../shared/utils/moduleAccess';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { Button } from '../../shared/components/buttons/Button';
import { useDisplayPrices } from '../../shared/utils/useDisplayPrices';
import { formatCurrency } from '../../shared/utils/formatCurrency';
import { useReferralEarnings, useApplyReferralCode } from '../../modules/referral/api/useReferralQueries';
import { AuthLayout } from './AuthLayout';
import { AUTH_HERO_IMAGES } from './authHeroImages';
import { CreditCard, Smartphone, CheckCircle, Loader2, AlertCircle, ChevronLeft, ArrowRight, Wallet, Tag, ChevronDown, ChevronUp } from 'lucide-react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const subscription = user?.business?.subscription;
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [initiated, setInitiated] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeSuccess, setPromoCodeSuccess] = useState<string | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const applyReferralMutation = useApplyReferralCode();

  const { currency, onboardingFee, usdOnboardingFee, exchangeRate } = useDisplayPrices();
  const { data: earnings } = useReferralEarnings();
  const availableCredit = earnings?.available_credit ?? 0;
  const referralDiscountUsd = subscription?.referral?.discount_applied
    ? Number(subscription.referral.discount_applied)
    : 0;
  const { data: plans, isLoading: plansLoading } = useActivePlans();
  const plan = plans?.find((p) => p.id === subscription?.plan_id);

  const { refetch: refetchProfile, isRefetching } = useProfile();
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

  const fee = plan ? onboardingFee(plan) : 0;
  const feeUsd = plan ? usdOnboardingFee(plan) : 0;
  const userPhone = user?.business?.phone || user?.phone || '';
  const isPaymentDone = paymentQuery.data?.data?.status === 'completed';

  const paymentCurrency = getPaymentCurrency();
  const canPayLocal = paymentCurrency !== 'USD' && exchangeRate !== null;

  // When business currency isn't natively supported (UGX/KES/TZS only), show prices in USD
  const displayCurrency = canPayLocal ? currency : 'USD';
  const displayedFee = canPayLocal ? fee : feeUsd;

  const referralDiscountConverted = referralDiscountUsd > 0 && canPayLocal && exchangeRate !== null
    ? Math.round(referralDiscountUsd * exchangeRate * 100) / 100
    : referralDiscountUsd;
  const creditConverted = canPayLocal && availableCredit > 0 && exchangeRate !== null
    ? Math.round(availableCredit * exchangeRate * 100) / 100
    : availableCredit;
  const effectiveDiscount = referralDiscountConverted > 0 ? referralDiscountConverted : creditConverted;
  const totalDue = Math.max(0, displayedFee - effectiveDiscount);
  const canPay = canPayLocal ? !!fee : !!feeUsd;

  const handlePay = () => {
    if (!canPay) return;

    const paymentAmount = canPayLocal
      ? Math.round(Number(feeUsd) * exchangeRate! * 100) / 100
      : Number(feeUsd);
    const sendCurrency = canPayLocal ? paymentCurrency : 'USD';

    initiateMutation.mutate(
      { amount: paymentAmount, currency: sendCurrency, phone: userPhone },
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
                {formatCurrency(Number(displayedFee), displayCurrency)}
              </span>
            </div>
            {plan.trial_days ? (
              <div className="bg-blue-100/50 rounded-lg px-3 py-2 text-center">
                <span className="text-xs font-semibold text-blue-700">
                  {plan.trial_days}-day trial period starts after payment
                </span>
              </div>
            ) : null}
            {subscription?.referral?.code && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-700">
                    Promo code <span className="font-mono">{subscription.referral.code}</span> applied
                  </span>
                </div>
                <p className="text-[11px] text-indigo-600/80 pl-5">
                  {subscription.referral.discount_type === 'percentage'
                    ? `${subscription.referral.discount_value}% off your subscription for ${subscription.referral.discount_duration_months ?? 0} month${(subscription.referral.discount_duration_months ?? 0) > 1 ? 's' : ''}`
                    : subscription.referral.discount_type === 'free_month'
                      ? 'One month free on your subscription'
                      : 'Discount applied to your subscription'}
                </p>
              </div>
            )}
            {referralDiscountUsd > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Promo discount</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    -{formatCurrency(referralDiscountConverted, displayCurrency)}
                    {canPayLocal && referralDiscountUsd > 0 && (
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        (${referralDiscountUsd.toFixed(2)} USD)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-green-200 pt-1">
                  <span className="text-sm font-semibold text-gray-800">Total due today</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(totalDue, displayCurrency)}</span>
                </div>
              </div>
            )}
            {availableCredit > 0 && referralDiscountUsd <= 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Promo credit</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    -{formatCurrency(creditConverted, displayCurrency)}
                    {canPayLocal && availableCredit > 0 && (
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        (${availableCredit.toFixed(2)} USD)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-green-200 pt-1">
                  <span className="text-sm font-semibold text-gray-800">Total due today</span>
                  <span className="text-sm font-bold text-blue-700">{formatCurrency(totalDue, displayCurrency)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Smartphone className="w-4 h-4 text-gray-400" />
            Phone Number
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {userPhone || 'No phone on file'}
          </p>
          <p className="text-xs text-gray-400">
            You'll choose your payment method when you proceed.
          </p>
        </div>

        {!subscription?.referral?.code && !promoCodeSuccess && (
          <div>
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
                          onSuccess: () => {
                            setPromoCodeSuccess('Code applied successfully');
                            setPromoCodeInput('');
                            setShowPromoInput(false);
                            refetchProfile();
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

        {!initiated && !isPaymentDone && (
          <Button
            type="button"
            onClick={handlePay}
            className="w-full gap-2 py-3.5 text-base"
            loading={initiateMutation.isPending}
            disabled={!canPay || !userPhone}
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

            {paymentQuery.data?.data?.status === 'failed' && (
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
            {isRefetching ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm font-medium text-blue-800">Updating your account...</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                <p className="font-semibold text-green-800">Payment Successful!</p>
                <p className="text-sm text-green-600">
                  Your plan is now active{plan?.trial_days ? `. Your ${plan.trial_days}-day trial period has started.` : '.'}
                </p>
                <Button type="button" onClick={handleContinue} className="w-full gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
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
