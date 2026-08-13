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
  if (typeof navigator === 'undefined') return 'desktop';
  if (navigator.userAgent.toLowerCase().includes('electron')) return 'electron';
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) return 'mobile';
  return 'desktop';
}

/** Paint a lightweight loading page into the blank popup so it never shows an
 *  empty/white window while the initiate request is still in flight. */
function paintLoading(win: Window): void {
  try {
    win.document.open();
    win.document.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<title>Custosell Payment</title>' +
      '<style>html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;' +
      'background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#334155;}' +
      '.box{text-align:center;padding:24px;}.spin{width:40px;height:40px;border:4px solid #c7d2fe;' +
      'border-top-color:#4f46e5;border-radius:50%;animation:s 0.8s linear infinite;margin:0 auto 12px;}' +
      '@keyframes s{to{transform:rotate(360deg)}}p{font-size:14px;margin:0}</style></head>' +
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
 * Device-aware, Google-sign-in-style payment window handling.
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
 * - Electron: no in-app window at all (would inherit nodeIntegration). The
 *   gateway URL is opened in the user's default browser via
 *   `shell.openExternal` through the `electronShell` bridge — setWindowOpenHandler
 *   in main.ts denies raw window.open and routes http(s) there too.
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
    const win = popupRef.current;
    if (win && !win.closed) {
      try {
        win.close();
      } catch {
        // Cross-origin windows can throw on close; safe to ignore.
      }
    }
    popupRef.current = null;
  }, []);

  // Close the popup/tab when the owning view unmounts so no orphan window lingers.
  useEffect(() => closePaymentPopupRef, [closePaymentPopupRef]);

  const openPaymentPopup = useCallback((): boolean => {
    setPopupBlocked(false);
    setOpenedExternally(false);
    setPaymentUrl(null);

    if (environment === 'electron') {
      // No in-app popup on Electron — the system browser handles it.
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
      // Open in the system browser. Keep the polling view alive in-app; when the
      // user returns, payment status updates automatically.
      setOpenedExternally(true);
      const bridge = window.electronShell;
      if (bridge?.openExternal) {
        void bridge.openExternal(url);
        return true;
      }
      setPopupBlocked(true);
      return false;
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
