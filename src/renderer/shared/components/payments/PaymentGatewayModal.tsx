import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

interface PaymentGatewayModalProps {
  url: string;
  /**
   * Dismiss ONLY the gateway overlay (mirrors closing the browser popup on web).
   * The Waiting-for-Payment modal underneath stays open so the user can Verify
   * manually or cancel.
   */
  onClose: () => void;
}

/**
 * In-app payment gateway overlay for Electron. The PesaPal page is embedded with
 * Electron's <webview> and rendered ABOVE the normal "Waiting for Payment" modal —
 * exactly like the separate browser popup on web. Closing it (X / Cancel / click
 * outside) only dismisses this overlay; the Waiting-for-Payment modal remains so
 * the user can Verify manually, then Continue once paid.
 */
export default function PaymentGatewayModal({ url, onClose }: PaymentGatewayModalProps) {
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
      <div className="fixed inset-0 z-[21000] flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/60"
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
              aria-label="Close payment page"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative h-[78vh] min-h-[440px] w-full bg-white">
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
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
