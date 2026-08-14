import { useState, useCallback } from 'react';
import { WifiOff, Wifi, Plane, Router, Signal, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks/useApp';
import { checkNetworkConnectivity } from '../../../app/store/slices/networkSlice';
import LogoImage from '../../assets/LogoImage';
import { PRODUCT_NAME, TAGLINE } from '../../brand/custosellBrand';
import { getUserFirstName } from '../../utils/userDisplayName';

const CONNECTION_TIPS = [
  { icon: Wifi, text: 'Check your internet connection - Wi‑Fi or mobile data should be on.' },
  { icon: Plane, text: 'Turn off airplane mode if it is enabled.' },
  { icon: Router, text: 'Move closer to your router, or try a different network.' },
  { icon: Signal, text: 'When you are ready, tap Reconnect below.' },
];

export default function Offline() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [retryStatus, setRetryStatus] = useState<'idle' | 'checking'>('idle');

  const handleRetry = useCallback(async () => {
    setRetryStatus('checking');
    try {
      await dispatch(checkNetworkConnectivity()).unwrap();
      setRetryStatus('idle');
    } catch {
      setTimeout(() => setRetryStatus('idle'), 2000);
    }
  }, [dispatch]);

  const firstName = getUserFirstName(user?.name, '');
  const headline = firstName ? `${firstName}, you're offline` : "You're offline";
  const reassurance = `Your data in ${PRODUCT_NAME} is safe - we'll reconnect when you're back.`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="mb-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <LogoImage size="md" />
          <span className="text-2xl font-bold text-blue-600">{PRODUCT_NAME}</span>
        </div>
        <p className="text-xs font-semibold tracking-wide text-blue-600">{TAGLINE}</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-gray-200/90 bg-white/90 px-8 py-10 shadow-xl shadow-gray-200/50 backdrop-blur-sm">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <WifiOff className="h-10 w-10 text-gray-500" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{headline}</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600">{reassurance}</p>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">What you can try</p>
          <ul className="space-y-3">
            {CONNECTION_TIPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm" aria-hidden>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-snug text-gray-600">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={retryStatus === 'checking'}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${retryStatus === 'checking' ? 'animate-spin' : ''}`} />
          {retryStatus === 'checking' ? 'Checking…' : 'Reconnect'}
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
          We will reconnect automatically when your network is back.
        </p>
      </div>

      <p className="mt-8 text-xs tracking-wide text-gray-400">
        Need help?{' '}
        <a href="mailto:support@custosell.com" className="font-medium text-blue-600 hover:underline">
          Contact support
        </a>
      </p>
    </div>
  );
}
