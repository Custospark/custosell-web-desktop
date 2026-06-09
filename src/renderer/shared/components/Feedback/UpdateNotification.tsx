import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IpcRendererEvent } from 'electron';
import { X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../app/contexts/ToastContext';

interface IpcRenderer {
  on: (channel: string, listener: (event: IpcRendererEvent, info: UpdateInfo) => void) => void;
  removeListener: (channel: string, listener: (event: IpcRendererEvent, info: UpdateInfo) => void) => void;
}

interface ElectronModule {
  ipcRenderer: IpcRenderer;
}

interface ElectronWindow extends Window {
  require: (module: string) => ElectronModule;
}

type UpdaterEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'update-error';

interface UpdateInfo {
  event: UpdaterEvent | string;
  data: {
    message?: string;
    version?: string;
    percent?: number;
    error?: string;
    speedMBps?: number;
    downloadedMB?: number;
    totalMB?: number;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatMb(n?: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  return `${n.toFixed(1)} MB`;
}

function formatSpeed(n?: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '';
  return `${n.toFixed(1)} MB/s`;
}

export function UpdateNotification() {
  const { showToast } = useToast();

  const [visible, setVisible] = useState(true);
  const [animOut, setAnimOut] = useState(false);
  const [stage, setStage] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'error'>('idle');
  const [version, setVersion] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<number | undefined>();
  const [downloadedMB, setDownloadedMB] = useState<number | undefined>();
  const [totalMB, setTotalMB] = useState<number | undefined>();

  const lastToastKeyRef = useRef('');

  const dismiss = useCallback(() => {
    setAnimOut(true);
    window.setTimeout(() => {
      setVisible(false);
      setAnimOut(false);
    }, 220);
  }, []);

  const showOnceToast = useCallback(
    (key: string, variant: 'info' | 'success' | 'error', msg: string, duration = 6000) => {
      if (lastToastKeyRef.current === key) return;
      lastToastKeyRef.current = key;
      showToast(variant, msg, duration);
    },
    [showToast],
  );

  const isElectron = useMemo(
    () => typeof window !== 'undefined' && typeof (window as ElectronWindow).require === 'function',
    [],
  );

  useEffect(() => {
    if (!isElectron) return;

    const { ipcRenderer } = (window as ElectronWindow).require('electron');

    const onUpdaterMessage = (_event: IpcRendererEvent, info: UpdateInfo) => {
      const evt = info?.event;
      const data = info?.data ?? {};

      switch (evt) {
        case 'checking-for-update':
          setStage('checking');
          return;

        case 'update-available':
          setStage('downloading');
          setVisible(true);
          setAnimOut(false);
          setVersion(data.version);
          showOnceToast(
            `available:${data.version ?? ''}`,
            'info',
            data.version
              ? `An update (v${data.version}) is downloading in the background.`
              : 'An update is downloading in the background.',
            6500,
          );
          return;

        case 'download-progress':
          setStage('downloading');
          setVisible(true);
          setProgress(clamp(Math.round(data.percent ?? 0), 0, 100));
          setSpeed(typeof data.speedMBps === 'number' ? data.speedMBps : undefined);
          setDownloadedMB(typeof data.downloadedMB === 'number' ? data.downloadedMB : undefined);
          setTotalMB(typeof data.totalMB === 'number' ? data.totalMB : undefined);
          return;

        case 'update-downloaded':
          setStage('ready');
          setProgress(100);
          setVersion(data.version);
          window.setTimeout(() => dismiss(), 900);
          showOnceToast(
            `ready:${data.version ?? ''}`,
            'success',
            data.version
              ? `Update v${data.version} is ready. It will be installed when you exit the app.`
              : 'Update is ready. It will be installed when you exit the app.',
            9000,
          );
          return;

        case 'update-error':
          setStage('error');
          setProgress(0);
          dismiss();
          showOnceToast(
            `error:${data.error ?? ''}`,
            'error',
            'Update failed. We will retry automatically in the background.',
            7000,
          );
          return;

        case 'update-not-available':
          setStage('idle');
          return;

        default:
          return;
      }
    };

    ipcRenderer.on('updater-message', onUpdaterMessage);
    return () => {
      ipcRenderer.removeListener('updater-message', onUpdaterMessage);
    };
  }, [isElectron, showOnceToast, dismiss]);

  const shouldShowCard = visible && (stage === 'downloading' || stage === 'ready' || stage === 'error');
  if (!shouldShowCard) return null;

  const subtitle = (() => {
    const parts: string[] = [];
    if (typeof downloadedMB === 'number' && typeof totalMB === 'number') {
      parts.push(`${formatMb(downloadedMB)} of ${formatMb(totalMB)}`);
    }
    if (typeof speed === 'number') {
      parts.push(formatSpeed(speed));
    }
    return parts.length ? parts.join(' · ') : 'Downloading update…';
  })();

  return (
    <div
      className={[
        'fixed bottom-4 right-4 z-[10000]',
        'min-w-[340px] max-w-[400px]',
        'px-5 py-4 rounded-2xl text-white',
        'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800',
        'border border-white/10 shadow-2xl backdrop-blur-sm',
        'transition-all duration-200 ease-out',
        animOut ? 'opacity-0 translate-y-2 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide update progress"
        title="Hide (download continues in background)"
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 active:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <X className="w-4 h-4 text-white/80" strokeWidth={2.5} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5 shrink-0">
          {stage === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-amber-300" strokeWidth={2.2} />
          ) : stage === 'ready' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300" strokeWidth={2.2} />
          ) : (
            <RefreshCw className="w-5 h-5 text-sky-300 animate-spin" strokeWidth={2.2} />
          )}
        </div>

        <div className="flex-1">
          <p className="font-semibold text-[15px] leading-tight">
            {version ? `Updating to v${version}…` : 'Updating…'}
          </p>
          <p className="mt-1 text-[13px] text-white/70 leading-snug">{subtitle}</p>
        </div>

        <div className="shrink-0 text-[13px] font-semibold tabular-nums text-white/90">
          {progress}%
        </div>
      </div>

      <div className="mt-3 w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
