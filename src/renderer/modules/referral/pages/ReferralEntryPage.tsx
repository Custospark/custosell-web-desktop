import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { getDefaultRoute } from '../../../shared/utils/moduleAccess';
import { Button } from '../../../shared/components/buttons/Button';
import { useApplyReferralCode } from '../api/useReferralQueries';
import { Gift, ArrowRight, Check, X } from 'lucide-react';

export default function ReferralEntryPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const applyReferral = useApplyReferralCode();
  const [code, setCode] = useState('');
  const [skip, setSkip] = useState(false);

  const needsOnboarding = user?.business?.subscription?.onboarding_fee_paid === false;

  const nextRoute = () => {
    if (needsOnboarding) {
      navigate(ROUTES.ONBOARDING);
    } else {
      navigate(getDefaultRoute(user));
    }
  };

  const handleApply = () => {
    if (!code.trim()) return;
    applyReferral.mutate(
      { referral_code: code.trim() },
      { onSuccess: () => nextRoute() },
    );
  };

  const handleSkip = () => {
    setSkip(true);
    nextRoute();
  };

  const hasReferralAlready = applyReferral.isSuccess;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <Gift className="h-7 w-7 text-blue-600" />
        </div>

        {hasReferralAlready ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Referral code applied!</h1>
            <p className="mt-2 text-sm text-gray-500">Redirecting you...</p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-xl font-semibold text-gray-900">
              Have a referral code?
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              Enter a referral code to get a discount on your subscription.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="referral-code" className="block text-sm font-medium text-gray-700">
                  Referral code
                </label>
                <input
                  id="referral-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={applyReferral.isPending}
                  autoFocus
                />
                {applyReferral.isError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <X className="h-3 w-3" />
                    {applyReferral.error?.response?.data?.message || 'Invalid or expired code'}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleApply}
                  disabled={!code.trim() || applyReferral.isPending}
                  className="w-full"
                >
                  {applyReferral.isPending ? 'Applying...' : 'Apply Code'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <button
                  onClick={handleSkip}
                  disabled={applyReferral.isPending || skip}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Skip this step
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
