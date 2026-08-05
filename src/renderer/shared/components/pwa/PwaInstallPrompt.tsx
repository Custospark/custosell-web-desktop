import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Non-standard `beforeinstallprompt` event (Chrome/Edge + Android/desktop). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isElectron =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

const DISMISS_KEY = 'custosell_pwa_install_dismissed_at';
const INSTALL_ACK_KEY = 'custosell_pwa_install_acknowledged';
/** Re-show the prompt N days after the last dismiss, in case the user never installed. */
const RE_SHOW_MS = 1000 * 60 * 60 * 24 * 30;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as unknown as { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true // iOS Safari (installed)
  );
}

function isMobileHandset(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches
  );
}

function isIos(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

/**
 * Mobile web install prompt. Runs only in a narrow webview (not a desktop
 * browser, not the Electron app, not an already-installed PWA). On Android it
 * uses the browser's native `beforeinstallprompt`; on iOS (no such event) it
 * shows Share → Add to Home Screen instructions. Dismissible for a month.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [acked, setAcked] = useState(
    () => typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(INSTALL_ACK_KEY)),
  );
  const [dismissedForNow] = useState(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return dismissedAt !== 0 && Date.now() - dismissedAt < RE_SHOW_MS;
  });
  const [justDismissed, setJustDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isElectron || isStandalone() || !isMobileHandset()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALL_ACK_KEY, '1');
      setAcked(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(INSTALL_ACK_KEY, '1');
        setAcked(true);
      }
    } catch {
      // prompt() can throw if the browser revoked install affordance — ignore.
    }
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setJustDismissed(true);
    setDeferred(null);
  };

  const suppressed =
    isElectron ||
    isStandalone() ||
    !isMobileHandset() ||
    acked ||
    justDismissed ||
    dismissedForNow;

  const canNativeInstall = deferred !== null;

  // Android waits for `beforeinstallprompt`; iOS has no event so show immediately.
  if (suppressed || (!canNativeInstall && !isIos())) return null;

  return (
    <div
      role="complementary"
      aria-label="Install Custosell"
      className="fixed z-[52] inset-x-3 bottom-[5.5rem] mx-auto max-w-md lg:hidden"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Install Custosell</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            {canNativeInstall
              ? 'Run it like a native app — opens full-screen with no address bar.'
              : (
                <span className="flex items-start gap-1">
                  <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden />
                  <span>
                    Tap <span className="font-semibold text-gray-700">Share</span> →{' '}
                    <span className="font-semibold text-gray-700">Add to Home Screen</span> for a native experience.
                  </span>
                </span>
              )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {canNativeInstall ? (
            <button
              type="button"
              onClick={handleInstall}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5',
                'text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer',
              )}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Install
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              Got it
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-gray-400',
              'hover:bg-gray-100 hover:text-gray-600 cursor-pointer',
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}