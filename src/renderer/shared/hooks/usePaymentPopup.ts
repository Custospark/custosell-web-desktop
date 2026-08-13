import { useCallback, useRef, useState } from 'react';

const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 720;

export interface PaymentPopup {
  popupBlocked: boolean;
  paymentUrl: string | null;
  openPaymentPopup: () => boolean;
  redirectPaymentWindow: (url: string) => boolean;
  closePaymentPopup: () => void;
  resetPaymentPopup: () => void;
}

/**
 * Google-sign-in style payment window handling.
 *
 * `window.open()` triggered inside an async callback (e.g. the onSuccess of a
 * payment-initiation request) is treated by browsers as a popup and silently
 * blocked, leaving the user on a polling screen with no payment page. To avoid
 * this we open a blank popup SYNCHRONOUSLY inside the user's click gesture —
 * which browsers allow — and then redirect that same window to the gateway URL
 * once the API returns it. If the popup is still blocked we surface
 * `popupBlocked` so the UI can show a manual fallback link instead of leaving
 * the user hanging.
 */
export function usePaymentPopup(): PaymentPopup {
  const popupRef = useRef<Window | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const openPaymentPopup = useCallback((): boolean => {
    const left = Math.max(0, Math.round((window.screen.width - POPUP_WIDTH) / 2));
    const top = Math.max(0, Math.round((window.screen.height - POPUP_HEIGHT) / 3));

    const win = window.open('', 'custosell_payment_window', `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`);

    if (!win || win.closed || typeof win.closed === 'undefined') {
      setPopupBlocked(true);
      return false;
    }

    popupRef.current = win;
    setPopupBlocked(false);
    return true;
  }, []);

  const redirectPaymentWindow = useCallback((url: string): boolean => {
    setPaymentUrl(url);
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
  }, []);

  const closePaymentPopup = useCallback(() => {
    const win = popupRef.current;
    if (win && !win.closed) {
      win.close();
    }
    popupRef.current = null;
  }, []);

  const resetPaymentPopup = useCallback(() => {
    closePaymentPopup();
    setPopupBlocked(false);
    setPaymentUrl(null);
  }, [closePaymentPopup]);

  return {
    popupBlocked,
    paymentUrl,
    openPaymentPopup,
    redirectPaymentWindow,
    closePaymentPopup,
    resetPaymentPopup,
  };
}
