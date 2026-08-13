import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface PaymentPopupNoticeProps {
  popupBlocked: boolean;
  paymentUrl: string | null;
}

/**
 * Rendered inside payment polling screens when the popup could not be opened.
 * The "Open Payment Page" button re-opens the gateway URL from a fresh user
 * gesture (so it is not subject to popup blockers), giving the user a manual
 * path instead of leaving them stuck on a waiting spinner.
 */
export default function PaymentPopupNotice({ popupBlocked, paymentUrl }: PaymentPopupNoticeProps) {
  const [manualOpenFailed, setManualOpenFailed] = useState(false);

  if (!popupBlocked) return null;

  const handleOpenManually = () => {
    setManualOpenFailed(false);
    if (!paymentUrl) return;
    const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed) {
      setManualOpenFailed(true);
    }
  };

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 text-left space-y-2">
      <div className="flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Your payment window didn't open automatically.</span>
      </div>
      {paymentUrl ? (
        <button
          type="button"
          onClick={handleOpenManually}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Payment Page
        </button>
      ) : (
        <span>Please allow pop-ups for this site and try again.</span>
      )}
      {manualOpenFailed && (
        <p className="text-amber-700">
          Still blocked? Allow pop-ups for this site in your browser, then tap the button again.
        </p>
      )}
    </div>
  );
}
