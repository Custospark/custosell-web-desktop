import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

interface PaymentGatewayModalProps {
  url: string;
  onClose: () => void;
  /** Mobile-money number the STK push is sent to — shown in the polling status. */
  phone?: string;
}

/**
 * In-app payment gateway modal for Electron. The PesaPal page is embedded with
 * Electron's <webview> INSIDE the app (like any other modal) — no separate
 * BrowserWindow exists, so closing/cancelling is just unmounting a React
 * overlay. The user's app state underneath is never touched.
 *
 * Web/mobile don't render this; they use their own popup/tab flow.
 */
export default function PaymentGatewayModal({ url, onClose, phone }: PaymentGatewayModalProps) {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onLoad = () => {
      setLoading(false);
      setFailed(false);
    };
    const onFail = () => {
      setLoading(false);
      setFailed(true);
    };

    wv.addEventListener('did-finish-load', onLoad);
    wv.addEventListener('did-fail-load', onFail);

    return () => {
      wv.removeEventListener('did-finish-load', onLoad);
      wv.removeEventListener('did-fail-load', onFail);
    };
  }, [url]);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[20000] flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Secure Payment</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-800 cursor-pointer"
              aria-label="Cancel payment"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative h-[78vh] min-h-[420px] w-full bg-white">
            {/* Loading overlay so the embedded page never flashes blank/white. */}
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-base font-semibold text-slate-800">Connecting to secure payment…</p>
                <p className="text-sm text-slate-500">Complete the payment, then come back — we'll confirm automatically.</p>
              </div>
            )}

            {failed ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
                <p className="text-base font-semibold text-slate-800">Couldn't load the payment page.</p>
                <button
                  type="button"
                  onClick={() => { setFailed(false); setLoading(true); }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            <webview
              ref={(el) => { webviewRef.current = el; }}
              src={url}
              className="h-full w-full"
              allowpopups={true}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
              <p className="min-w-0 text-xs text-slate-600">
                Waiting for payment
                {phone ? (
                  <>
                    {' '}— STK push sent to <span className="font-semibold">{phone}</span>
                  </>
                ) : null}
                {' '}— complete it in the window above, we'll confirm automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
