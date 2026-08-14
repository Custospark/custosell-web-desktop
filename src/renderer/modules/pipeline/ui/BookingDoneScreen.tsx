import { useState } from 'react';
import { CalendarDays, Check, Clock, Copy, Video } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { ensureHttps } from './bookingHelpers';
import { useToast } from '../../../app/contexts/useToast';

interface BookingDoneScreenProps {
  businessName: string;
  selectedLocalDate: string;
  selectedLocalTime: string;
  selectedLocalEnd: string;
  referenceCode?: string;
  checkUrl?: string;
  meetingLink?: string | null;
}

export default function BookingDoneScreen({
  businessName,
  selectedLocalDate,
  selectedLocalTime,
  selectedLocalEnd,
  referenceCode,
  checkUrl,
  meetingLink,
}: BookingDoneScreenProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!checkUrl) return;
    navigator.clipboard.writeText(checkUrl);
    setCopied(true);
    showToast('success', 'Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <Clock className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Request submitted</h2>
      <p className="mt-1 text-sm text-gray-500">
        Meeting with{' '}
        <span className="font-semibold text-gray-700">{businessName}</span>
      </p>
      <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{selectedLocalDate}</span>
        <Clock className="ml-1 h-3.5 w-3.5" />
        <span>{selectedLocalTime}{selectedLocalEnd ? ` - ${selectedLocalEnd}` : ''}</span>
      </div>

      <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <Clock className="h-3.5 w-3.5" />
        <span>Pending approval &mdash; you'll hear back soon</span>
      </div>

      {referenceCode && (
        <div className="mx-auto mt-4 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm">
          <p className="mb-1 text-xs font-medium text-gray-500">Reference code</p>
          <p className="font-mono text-base font-bold tracking-wider text-indigo-700">{referenceCode}</p>
        </div>
      )}

      {checkUrl && (
        <div className="mx-auto mt-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3 text-left">
          <p className="mb-1 text-xs font-medium text-indigo-600">Check booking status</p>
          <p className="mb-1.5 text-[11px] text-indigo-500">
            Save this link to check if your meeting is confirmed:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={checkUrl}
              className="flex-1 truncate rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs text-indigo-700"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all',
                copied ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700',
              )}
            >
              {copied ? (
                <Check className="my-auto mr-1 inline-block h-3 w-3" />
              ) : (
                <Copy className="my-auto mr-1 inline-block h-3 w-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {meetingLink && (
        <div className="mx-auto mt-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm">
          <p className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-600">
            <Video className="h-3.5 w-3.5 text-indigo-400" />
            Meeting link
          </p>
          <a
            href={ensureHttps(meetingLink) ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {meetingLink}
          </a>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        We look forward to speaking with you.
      </p>
    </div>
  );
}
