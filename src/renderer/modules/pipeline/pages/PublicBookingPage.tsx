import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Clock, User, Mail, Phone, MessageSquare, Loader2, ArrowRight, Building2, Video, XCircle, Copy, Link, Check } from 'lucide-react';
import { useToast } from '../../../app/contexts/useToast';
import { cn } from '../../../shared/utils/cn';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useBookingInfo, useBookingSlots, useCreateBooking } from '../api/useBookingQueries';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import type { CreateBookingPayload, TimeSlot } from '../api/useBookingQueries';

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatSlotRange(slot: TimeSlot): string {
  return `${formatTime(slot.time)} — ${formatTime(slot.end_time)}`;
}

const DAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu',
  5: 'Fri', 6: 'Sat', 7: 'Sun',
};

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export default function PublicBookingPage() {
  const { token } = useParams<{ token: string }>();
  const { data: infoData, isLoading: infoLoading } = useBookingInfo(token ?? '');

  const today = toDateInputValue(new Date());
  const maxDate = toDateInputValue(addDays(new Date(), 60));
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'datetime' | 'details' | 'done'>('datetime');

  const { data: slotsData, isLoading: slotsLoading } = useBookingSlots(token ?? '', selectedDate);
  const createBooking = useCreateBooking(token ?? '');
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const info = infoData?.data;
  const allSlots: TimeSlot[] = slotsData?.data?.slots ?? [];

  const availableDayNames = info?.available_days
    ? info.available_days.map((d) => DAY_NAMES[d]).filter(Boolean)
    : [];

  if (infoLoading) {
    return <CustosellLoader message="Loading booking info..." />;
  }

  if (!info) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
          <CalendarDays className="h-6 w-6 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Booking unavailable</h2>
        <p className="mt-2 text-sm text-gray-500">
          This booking link is invalid or has been disabled.
        </p>
      </div>
    );
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime('');
  };

  const canProceedToDetails = selectedDate && selectedTime;
  const canSubmit = name.trim().length > 0;

  const handleNext = () => {
    if (canProceedToDetails) setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !name.trim() || !token) return;

    const payload: CreateBookingPayload = {
      date: selectedDate,
      time: selectedTime,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      meeting_link: meetingLink.trim() || undefined,
      notes: notes.trim() || 'Agenda, topics, or anything else...',
    };

    await createBooking.mutateAsync(payload);
    setStep('done');
  };

  const bookingResponse = createBooking.data;
  const referenceCode = bookingResponse?.reference_code;
  const checkUrl = bookingResponse?.check_url;

  const handleCopyLink = () => {
    if (!checkUrl) return;
    navigator.clipboard.writeText(checkUrl);
    setCopied(true);
    showToast('success', 'Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'done') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Request submitted</h2>
        <p className="mt-1 text-sm text-gray-500">
          Meeting with{' '}
          <span className="font-semibold text-gray-700">{info.business_name || info.board_name}</span>
        </p>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{selectedDate}</span>
          <Clock className="ml-1 h-3.5 w-3.5" />
          <span>{formatTime(selectedTime)}</span>
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

        {info.meeting_link && (
          <div className="mx-auto mt-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm">
            <p className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-600">
              <Video className="h-3.5 w-3.5 text-indigo-400" />
              Meeting link
            </p>
            <a
              href={info.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              {info.meeting_link}
            </a>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          We look forward to speaking with you.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
          {info.logo_path ? (
            <img src={avatarUrl(info.logo_path) ?? ''} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <CalendarDays className="h-6 w-6 text-white" />
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Schedule a meeting
        </h1>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <Building2 className="h-4 w-4 text-indigo-400" />
          with{' '}
          <span className="font-semibold text-gray-700">
            {info.business_name || info.board_name}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {availableDayNames.join(', ')} &middot; {info.start_time} &ndash; {info.end_time}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
        {step === 'datetime' && (
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-600">1</div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Pick a date & time</h2>
                <p className="text-xs text-gray-400">Select when you'd like to meet</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                <CalendarDays className="mr-1.5 inline-block h-3.5 w-3.5 text-indigo-400" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={today}
                max={maxDate}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">
                  <Clock className="mr-1.5 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Available time slots
                </label>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  </div>
                ) : allSlots.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No slots available for this date. Pick another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {allSlots.map((slot) => {
                      const isTaken = !slot.available;
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isTaken}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-all ${
                            isTaken
                              ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                              : isSelected
                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          <span className="block text-xs">{formatSlotRange(slot)}</span>
                          {isTaken && (
                            <span className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-gray-400">
                              <XCircle className="h-3 w-3" />
                              Taken
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToDetails}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-600">2</div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
                <p className="text-xs text-gray-400">How can we reach you?</p>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2 text-xs text-indigo-600">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{selectedDate}</span>
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(selectedTime)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  <User className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Your name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  <Mail className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  <Phone className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Phone number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256 700 000 000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  <Link className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Meeting link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-1 text-[11px] text-gray-400">Optional — add a video link so the host can join online</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  <MessageSquare className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                  Meeting notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Agenda, topics, or anything else..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setStep('datetime')}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {createBooking.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                Confirm booking
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
