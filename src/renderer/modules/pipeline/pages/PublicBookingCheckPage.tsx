import { useParams } from 'react-router-dom';
import { CalendarDays, Clock, User, Mail, Phone, MessageSquare, Video, CheckCircle, XCircle, AlertTriangle, CheckCheck, Building2, MapPin } from 'lucide-react';
import { useCheckBooking } from '../api/useBookingQueries';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { ensureHttps } from '../ui/bookingHelpers';

function formatTime(hhmm: string): string {
  const d = new Date(hhmm);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAddress(booking: {
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_postal_code: string | null;
  business_country: string | null;
}): string | null {
  const parts = [
    booking.business_address,
    [booking.business_city, booking.business_state].filter(Boolean).join(', '),
    booking.business_postal_code,
    booking.business_country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function PublicBookingCheckPage() {
  const { token, reference } = useParams<{ token: string; reference: string }>();
  const { data, isLoading, error } = useCheckBooking(token ?? '', reference ?? '');

  const booking = data?.data;

  if (isLoading) {
    return <CustosellLoader message="Checking your booking..." />;
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-32 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Booking not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          This reference code is invalid or the booking no longer exists.
        </p>
      </div>
    );
  }

  const StatusIcon = booking.booking_status === 'approved' ? CheckCircle :
    booking.booking_status === 'completed' ? CheckCheck :
    booking.booking_status === 'rejected' ? XCircle : Clock;

  const statusColor = booking.booking_status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
    booking.booking_status === 'completed' ? 'bg-blue-50 text-blue-600' :
    booking.booking_status === 'rejected' ? 'bg-red-50 text-red-600' :
    'bg-amber-50 text-amber-600';

  const statusLabel = booking.booking_status === 'approved' ? 'Confirmed' :
    booking.booking_status === 'completed' ? 'Completed' :
    booking.booking_status === 'rejected' ? 'Declined' :
    'Pending';

  const address = formatAddress(booking);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="rounded-xl border border-gray-100 bg-white text-center shadow-sm">
        {/* Business header */}
        <div className="border-b border-gray-100 px-5 py-3.5">
          {booking.logo_path ? (
            <img src={avatarUrl(booking.logo_path) ?? ''} alt="" className="mx-auto mb-1.5 h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Building2 className="h-5 w-5 text-indigo-500" />
            </div>
          )}
          <h1 className="text-base font-bold text-gray-900">{booking.business_name}</h1>
        </div>

        {/* Status */}
        <div className="px-5 py-4">
          <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${statusColor}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{statusLabel}</h2>
          {booking.start_date && (
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(booking.start_date)} · {formatTime(booking.start_date)}
              {booking.end_date && ` — ${formatTime(booking.end_date)}`}
            </p>
          )}
        </div>

        <div className="space-y-2.5 px-5 pb-4 text-left">
          {booking.start_date && (
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>{formatDate(booking.start_date)}</span>
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formatTime(booking.start_date)}{booking.end_date ? ` — ${formatTime(booking.end_date)}` : ''}</span>
            </div>
          )}

          {booking.rejection_reason && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{booking.rejection_reason}</span>
            </div>
          )}

          {booking.meeting_link && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-600">
                <Video className="h-3.5 w-3.5 text-indigo-400" />
                Meeting link
              </p>
              <a
                href={ensureHttps(booking.meeting_link) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {booking.meeting_link}
              </a>
            </div>
          )}

          {booking.name && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-gray-600">Contact details</p>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-gray-700">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {booking.name}
                </p>
                {booking.email && (
                  <p className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {booking.email}
                  </p>
                )}
                {booking.phone && (
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {booking.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {booking.notes && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-gray-600">Meeting notes</p>
              <p className="flex items-start gap-2 text-sm text-gray-700">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>{booking.notes}</span>
              </p>
            </div>
          )}

          {(booking.business_email || booking.business_phone || address) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-xs font-medium text-gray-600">Business information</p>
              <div className="space-y-1.5 text-sm">
                {booking.business_email && (
                  <p className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {booking.business_email}
                  </p>
                )}
                {booking.business_phone && (
                  <p className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {booking.business_phone}
                  </p>
                )}
                {address && (
                  <p className="flex items-start gap-2 text-gray-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span>{address}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-2.5">
          <p className="text-[10px] text-gray-400">
            Ref: {booking.reference_code}
          </p>
        </div>
      </div>
    </div>
  );
}