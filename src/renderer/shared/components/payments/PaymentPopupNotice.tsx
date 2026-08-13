import { useState } from 'react';
import { AlertCircle, ExternalLink, ExternalLinkIcon, MonitorCheck } from 'lucide-react';
import type { PaymentEnvironment } from '../../hooks/usePaymentPopup';

interface PaymentPopupNoticeProps {
  popupBlocked: boolean;
  paymentUrl: string | null;
  openedExternally?: boolean;
  environment?: PaymentEnvironment;
}

/** Open a URL from a user gesture.
 *  - Electron: MUST use the preload bridge → shell.openExternal (real browser).
 *    Never window.open, which would create a blank in-app child window.
 *  - Web/mobile: window.open is fine (real browser tab). */
function openExternally(url: string, environment: PaymentEnvironment): boolean {
  if (environment === 'electron') {
    const bridge = window.electronShell;
    if (bridge?.openExternal) {
      void bridge.openExternal(url);
      return true;
    }
    return false;
  }
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return !!(win && !win.closed);
}

/**
 * Rendered inside payment polling screens:
 * - When the gateway window opened normally, returns null (the in-app modal is
 *   the only payment path).
 * - When blocked, shows a manual "Open Payment Page" button.
 * - On Electron, when payment fell back to the system browser, shows an
 *   informational "opened in your browser" box.
 *
 * Every open is triggered from a fresh user gesture and routed through
 * shell.openExternal on Electron — the polling screen is never covered by a
 * blank in-app window.
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
              if (!openExternally(paymentUrl, environment)) setManualOpenFailed(true);
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

  // Normal waiting state: the in-app modal is the payment path — no alternative.
  if (!popupBlocked) return null;

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
          onClick={() => {
            setManualOpenFailed(false);
            if (!openExternally(paymentUrl, environment)) setManualOpenFailed(true);
          }}
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
