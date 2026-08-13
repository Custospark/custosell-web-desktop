import { useState } from 'react';
import { AlertCircle, ExternalLink, ExternalLinkIcon, MonitorCheck } from 'lucide-react';
import type { PaymentEnvironment } from '../../hooks/usePaymentPopup';

interface PaymentPopupNoticeProps {
  popupBlocked: boolean;
  paymentUrl: string | null;
  openedExternally?: boolean;
  environment?: PaymentEnvironment;
  /** Opens the gateway in the system browser / new tab from a user gesture. */
  onOpenInBrowser?: (url: string) => void;
}

/**
 * Rendered inside payment polling screens:
 * - When the gateway window opened normally, shows a subtle "Complete payment in
 *   your browser" alternative so the user always has a fallback.
 * - When blocked, shows a manual "Open Payment Page" button.
 * - On Electron, when payment was sent to the system browser, shows an
 *   informational "opened in your browser" box.
 *
 * All manual opens happen from a fresh user gesture so they are not subject to
 * popup blockers, and the user is never left stuck on a waiting spinner.
 */
export default function PaymentPopupNotice({
  popupBlocked,
  paymentUrl,
  openedExternally = false,
  environment = 'desktop',
  onOpenInBrowser,
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
              if (onOpenInBrowser) {
                onOpenInBrowser(paymentUrl);
              } else {
                const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
                if (!win || win.closed) setManualOpenFailed(true);
              }
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

  // Normal waiting state: offer the browser alternative as a subtle fallback.
  if (!popupBlocked) {
    if (paymentUrl && onOpenInBrowser) {
      return (
        <div className="text-center">
          <button
            type="button"
            onClick={() => onOpenInBrowser(paymentUrl!)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-400 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {environment === 'mobile'
              ? 'Prefer a new tab? Complete payment in your browser'
              : 'Trouble with the popup? Complete payment in your browser'}
          </button>
        </div>
      );
    }
    return null;
  }

  const handleOpenManually = () => {
    setManualOpenFailed(false);
    if (!paymentUrl) return;
    if (onOpenInBrowser) {
      onOpenInBrowser(paymentUrl);
    } else {
      const win = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed) setManualOpenFailed(true);
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
