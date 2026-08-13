import { useState } from 'react';
import { AlertCircle, ExternalLink, ExternalLinkIcon, MonitorCheck } from 'lucide-react';
import type { PaymentEnvironment } from '../../hooks/usePaymentPopup';

interface PaymentPopupNoticeProps {
  popupBlocked: boolean;
  paymentUrl: string | null;
  openedExternally?: boolean;
  environment?: PaymentEnvironment;
}

/**
 * Rendered inside payment polling screens when the gateway window could not be
 * opened, or (Electron) to tell the user the payment opened in their system
 * browser and to return to the app when done.
 *
 * The "Open Payment Page" button re-opens the gateway URL from a fresh user
 * gesture (so it is not subject to popup blockers), giving the user a manual
 * path instead of leaving them stuck on a waiting spinner.
 */
export default function PaymentPopupNotice({
  popupBlocked,
  paymentUrl,
  openedExternally = false,
  environment = 'desktop',
}: PaymentPopupNoticeProps) {
  const [manualOpenFailed, setManualOpenFailed] = useState(false);

  // Electron: payment opened in the system browser — informational only.
  if (openedExternally) {
    return (
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 text-left space-y-1.5">
        <div className="flex items-start gap-1.5">
          <MonitorCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Payment opened in your browser. Complete it there, then come back — we'll confirm automatically.
          </span>
        </div>
        {paymentUrl ? (
          <button
            type="button"
            onClick={() => {
              setManualOpenFailed(false);
              const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
              if (!win || win.closed) setManualOpenFailed(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5" />
            Reopen Payment Page
          </button>
        ) : null}
        {manualOpenFailed && (
          <p className="text-blue-700">Couldn't reopen the page — tap the button above again.</p>
        )}
      </div>
    );
  }

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
        <span>
          {environment === 'mobile'
            ? "Your payment tab didn't open automatically."
            : "Your payment window didn't open automatically."}
        </span>
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
