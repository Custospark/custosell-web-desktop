import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Headset, Mail, MessageSquareHeart, Phone, WifiOff } from 'lucide-react';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { imperativeToast } from '../../app/contexts/imperativeToast';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../app/store/slices/networkSlice';
import { Button } from '../../shared/components/buttons/Button';
import { CUSTOSELL_SUPPORT } from './guideSupportConfig';

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    imperativeToast.show('success', successMessage);
  } catch {
    imperativeToast.show('error', 'Could not copy to clipboard');
  }
}

export default function GuideContactPage() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);

  const handleCopyEmail = useCallback(() => {
    void copyText(CUSTOSELL_SUPPORT.email, 'Email copied');
  }, []);

  const handleCopyPhone = useCallback((tel: string, display: string) => {
    void copyText(tel, `${display} copied`);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Headset className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Guide</p>
          <h1 className="text-2xl font-bold text-gray-900">Contact &amp; Help</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Reach the Custosell team for technical help when you are blocked and need a person.
          </p>
        </div>
      </div>

      {isOffline && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            You are offline. Copy the contact details below and reach us by phone or email when you reconnect.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Support email</h2>
          <p className="mt-1 text-sm text-gray-600">Best for account access, sync issues, and detailed error reports.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={`mailto:${CUSTOSELL_SUPPORT.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              {CUSTOSELL_SUPPORT.email}
            </a>
            <Button type="button" variant="secondary" size="sm" onClick={handleCopyEmail}>
              <Copy className="h-4 w-4" aria-hidden />
              Copy
            </Button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h2 className="text-sm font-semibold text-gray-900">Support phone</h2>
          <p className="mt-1 text-sm text-gray-600">Call or WhatsApp when you need urgent help during business hours.</p>
          <ul className="mt-3 space-y-2">
            {CUSTOSELL_SUPPORT.phones.map(({ label, display, tel }) => (
              <li
                key={tel}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                  <a href={`tel:${tel}`} className="mt-0.5 inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-700">
                    <Phone className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    {display}
                  </a>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleCopyPhone(tel, display)}>
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">{CUSTOSELL_SUPPORT.hours}</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Feedback vs Contact &amp; Help</h2>
        <ul className="mt-2 space-y-2 text-sm text-gray-700">
          <li>
            <strong>Feedback</strong> — product ideas, improvements, and non-urgent reports you want tracked in the app.
          </li>
          <li>
            <strong>Contact &amp; Help</strong> — login problems, sales not syncing, broken features, or anything stopping work today.
          </li>
        </ul>
        <Link
          to={ROUTES.GUIDE.FEEDBACK}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          <MessageSquareHeart className="h-4 w-4" aria-hidden />
          Go to Feedback
        </Link>
      </div>
    </div>
  );
}
