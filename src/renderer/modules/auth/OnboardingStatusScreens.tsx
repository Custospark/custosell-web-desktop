import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import LogoImage from '../../shared/assets/LogoImage';
import { PRODUCT_NAME } from '../../shared/brand/custosellBrand';
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface PaymentDoneScreenProps {
  handleContinue: () => void;
  isRefetching: boolean;
  selectedPlan?: { trial_days?: number | null };
}

export function PaymentDoneScreen({ handleContinue, isRefetching, selectedPlan }: PaymentDoneScreenProps) {
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
          {isRefetching ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
              <p className="text-sm font-medium text-gray-700">Updating your account...</p>
            </>
          ) : (
            <>
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
              <button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

interface WaitingScreenProps {
  handleVerifyPayment: () => void;
  verifying: boolean;
  popupBlocked: boolean;
  verifyMessage: string | null;
  onReset: () => void;
}

export function WaitingScreen({ handleVerifyPayment, verifying, popupBlocked, verifyMessage, onReset }: WaitingScreenProps) {
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
          {popupBlocked && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-left">
              Pop-up was blocked. Please allow pop-ups for this site and try again.
            </div>
          )}
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
            onClick={onReset}
            className="text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
          >
            Cancel and try again
          </button>
        </div>
      </main>
    </div>
  );
}

interface FailedScreenProps {
  onReset: () => void;
}

export function FailedScreen({ onReset }: FailedScreenProps) {
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
            onClick={onReset}
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
