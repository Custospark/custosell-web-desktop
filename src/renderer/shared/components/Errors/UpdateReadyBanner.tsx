import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface AppUpdatesBridge {
  getPendingVersion: () => Promise<string | null>;
  restartAndInstall: () => Promise<boolean>;
  onUpdateReady: (callback: (version: string) => void) => void;
}

const DISMISS_KEY = 'custosell_update_banner_dismissed_version';

function bridge(): AppUpdatesBridge | undefined {
  const api = (window as Window & { appUpdates?: AppUpdatesBridge }).appUpdates;
  return api;
}

/**
 * Full-width "update ready" strip (Electron only). Appears after the new
 * version has finished downloading and offers Restart & Update. Dismissal is
 * remembered per version so it doesn't nag on every reload.
 */
export function UpdateReadyBanner() {
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    const api = bridge();
    if (!api) return;

    let mounted = true;
    api.getPendingVersion().then((version) => {
      if (!mounted || !version) return;
      if (localStorage.getItem(DISMISS_KEY) === version) return;
      setPendingVersion(version);
    });

    api.onUpdateReady((version) => {
      if (!mounted) return;
      setPendingVersion(version);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!pendingVersion) return null;

  const handleRestart = () => {
    setRestarting(true);
    void bridge()?.restartAndInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, pendingVersion);
    setPendingVersion(null);
  };

  return (
    <div
      role="status"
      className="relative z-40 flex shrink-0 items-center gap-3 border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900"
    >
      <RefreshCw className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold">Custosell v{pendingVersion} is ready.</span>
        <span className="text-sky-800">A new version has been downloaded and will apply on restart.</span>
      </div>
      <button
        type="button"
        onClick={handleRestart}
        disabled={restarting}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={restarting ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} aria-hidden />
        Restart &amp; Update
      </button>
      <button
        type="button"
        title="Dismiss update notice"
        aria-label="Dismiss update notice"
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-sky-500 transition-colors hover:bg-sky-100 hover:text-sky-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}