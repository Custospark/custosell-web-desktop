import { useCallback, useEffect, useRef, useState } from 'react';

const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 760;
const POPUP_NAME = 'custosell_payment_window';

export type PaymentEnvironment = 'electron' | 'mobile' | 'desktop';

declare global {
  interface Window {
    electronShell?: {
      openExternal: (url: string) => Promise<boolean>;
    };
  }
}

function detectEnvironment(): PaymentEnvironment {
  if (typeof window === 'undefined') return 'desktop';
  // The preload bridge is the most reliable Electron marker (it only exists in
  // the desktop app); userAgent is a secondary check.
  if (window.electronShell?.openExternal || navigator.userAgent.toLowerCase().includes('electron')) {
    return 'electron';
  }
  if (window.matchMedia('(max-width: 768px)').matches) return 'mobile';
  return 'desktop';
}

/** Paint a lightweight loading page into the blank popup so it never shows an
 *  empty/white window while the initiate request is still in flight. The page is
 *  fully responsive (viewport meta + clamp() font size) so it renders cleanly in
 *  a mobile tab or a desktop popup. Only used for web/mobile — Electron hosts
 *  the gateway in an in-app modal instead. */
function paintLoading(win: Window): void {
  try {
    win.document.open();
    win.document.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Custosell Payment</title>' +
      '<style>html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;' +
      'background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#334155;}' +
      '.box{text-align:center;padding:24px;}.spin{width:clamp(44px,10vw,64px);height:clamp(44px,10vw,64px);' +
      'border:5px solid #c7d2fe;border-top-color:#4f46e5;border-radius:50%;animation:s 0.8s linear infinite;' +
      'margin:0 auto clamp(16px,3vw,20px);}' +
      '@keyframes s{to{transform:rotate(360deg)}}p{font-size:clamp(16px,4.5vw,22px);font-weight:600;margin:0;' +
      'line-height:1.4;color:#1e293b}</style></head>' +
      '<body><div class="box"><div class="spin"></div><p>Connecting to secure payment…</p></div></body></html>',
    );
    win.document.close();
  } catch {
    // Some environments restrict writes to the popup document; the redirect
    // that follows will replace the page anyway.
  }
}

export interface PaymentPopup {
  environment: PaymentEnvironment;
  /** True when the popup/tab could not be opened and a manual fallback is needed. */
  popupBlocked: boolean;
  /** True on Electron when the payment opened in the system browser. */
  openedExternally: boolean;
  paymentUrl: string | null;
  openPaymentPopup: () => boolean;
  redirectPaymentWindow: (url: string) => boolean;
  closePaymentPopup: () => void;
  resetPaymentPopup: () => void;
}

/**
 * Device-aware payment window handling.
 *
 * A plain `window.open()` inside an async callback (e.g. the onSuccess of a
 * payment-initiation request) is treated by browsers as a popup and silently
 * blocked, leaving the user on a polling screen with no payment page. To avoid
 * this we open a blank popup/tab SYNCHRONOUSLY inside the user's click gesture —
 * which browsers allow — and then redirect that same window to the gateway URL
 * once the API returns it.
 *
 * Per environment:
 * - Desktop web: a sized popup (wider, ~600px) opened synchronously, then
 *   redirected to the gateway. A loading page is painted first so the window
 *   never looks broken while the request is in flight.
 * - Electron: NO separate OS window is created at all. The gateway is hosted
 *   INSIDE the app as a modal <webview> (see PaymentGatewayModal), exactly like
 *   every other modal in the app. Dismissing the payment just unmounts a React
 *   overlay — there is no child window to glitch, so cancelling never blanks or
 *   interrupts whatever the user was doing.
 * - Mobile: a blank tab is opened synchronously (mobile ignores popup window
 *   features and blocks fewer synchronous opens), then redirected. If anything
 *   is still blocked, `popupBlocked` flips so the UI can show a manual
 *   "Open Payment Page" fallback instead of leaving the user hanging.
 */
export function usePaymentPopup(): PaymentPopup {
  const popupRef = useRef<Window | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [openedExternally, setOpenedExternally] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [environment] = useState<PaymentEnvironment>(detectEnvironment);

  const closePaymentPopupRef = useCallback(() => {
    if (environment === 'electron') {
      // No separate window on Electron — the gateway is an in-app modal, so
      // nothing to close here. The modal unmounts and drops the <webview>.
      return;
    }
    const win = popupRef.current;
    if (win && !win.closed) {
      try {
        win.close();
      } catch {
        // Cross-origin windows can throw on close; safe to ignore.
      }
    }
    popupRef.current = null;
  }, [environment]);

  // Close the popup/tab when the owning view unmounts so no orphan window lingers.
  useEffect(() => closePaymentPopupRef, [closePaymentPopupRef]);

  const openPaymentPopup = useCallback((): boolean => {
    setPopupBlocked(false);
    setOpenedExternally(false);
    setPaymentUrl(null);

    if (environment === 'electron') {
      // Nothing to open — the in-app modal hosts the gateway webview.
      return true;
    }

    const left = Math.max(0, Math.round((window.screen.width - POPUP_WIDTH) / 2));
    const top = Math.max(0, Math.round((window.screen.height - POPUP_HEIGHT) / 3));

    if (environment === 'mobile') {
      // Mobile ignores popup window features; open a plain tab instead.
      const win = window.open('', '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        setPopupBlocked(true);
        return false;
      }
      popupRef.current = win;
      paintLoading(win);
      return true;
    }

    const win = window.open(
      '',
      POPUP_NAME,
      `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
    );
    if (!win || win.closed || typeof win.closed === 'undefined') {
      setPopupBlocked(true);
      return false;
    }
    popupRef.current = win;
    paintLoading(win);
    return true;
  }, [environment]);

  const redirectPaymentWindow = useCallback((url: string): boolean => {
    setPaymentUrl(url);

    if (environment === 'electron') {
      // The in-app modal reads paymentUrl and hosts the gateway webview.
      return true;
    }

    const win = popupRef.current;
    if (!win || win.closed) {
      setPopupBlocked(true);
      return false;
    }
    try {
      win.location.href = url;
      return true;
    } catch {
      setPopupBlocked(true);
      return false;
    }
  }, [environment]);

  const closePaymentPopup = useCallback(() => {
    closePaymentPopupRef();
    setOpenedExternally(false);
  }, [closePaymentPopupRef]);

  const resetPaymentPopup = useCallback(() => {
    closePaymentPopupRef();
    setPopupBlocked(false);
    setOpenedExternally(false);
    setPaymentUrl(null);
  }, [closePaymentPopupRef]);

  return {
    environment,
    popupBlocked,
    openedExternally,
    paymentUrl,
    openPaymentPopup,
    redirectPaymentWindow,
    closePaymentPopup,
    resetPaymentPopup,
  };
}
