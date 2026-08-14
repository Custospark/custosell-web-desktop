import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, CalendarDays } from 'lucide-react';
import { useToast } from '../../../app/contexts/useToast';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useBookingInfo, useBookingSlots, useCreateBooking } from '../api/useBookingQueries';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import { countryCodes, type CountryCode } from '../../../shared/utils/countryCodes';
import type { CreateBookingPayload } from '../api/useBookingQueries';
import BookingDateTimeStep from '../ui/BookingDateTimeStep';
import BookingDetailsStep from '../ui/BookingDetailsStep';
import BookingDoneScreen from '../ui/BookingDoneScreen';
import {
  addDays,
  DAY_NAMES,
  formatIsoDate,
  formatIsoTime,
  formatTime,
  toDateInputValue,
  utcPartsFromSlot,
} from '../ui/bookingFormatHelpers';

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
  const [countryCode, setCountryCode] = useState<CountryCode>(() => countryCodes.find((c) => c.code === 'UG') || countryCodes[0]);

  const { data: slotsData, isLoading: slotsLoading } = useBookingSlots(token ?? '', selectedDate);
  const createBooking = useCreateBooking(token ?? '');
  const { showToast } = useToast();

  const info = infoData;
  const allSlots = slotsData?.slots ?? [];

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
        <h2 className="text-xl font-semibold text-gray-900">Bookings currently unavailable</h2>
        <p className="mt-2 text-sm text-gray-500">
          This business is not accepting bookings right now. Please check back later or contact them directly.
        </p>
      </div>
    );
  }

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedTime('');
  };

  const canProceedToDetails = Boolean(selectedDate && selectedTime);
  const canSubmit = name.trim().length > 0;

  const handleNext = () => {
    if (canProceedToDetails) setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !name.trim() || !token) return;

    const selectedSlot = allSlots.find((s) => s.time === selectedTime) ?? null;
    const utc = selectedSlot ? utcPartsFromSlot(selectedSlot) : null;

    const payload: CreateBookingPayload = {
      date: utc?.date || selectedDate,
      time: utc?.time || selectedTime,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() ? `${countryCode.dial_code}${phone.replace(/\D/g, '')}` : undefined,
      meeting_link: meetingLink.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await createBooking.mutateAsync(payload);
      setStep('done');
    } catch {
      showToast('error', 'Could not confirm booking. Please try again.');
    }
  };

  const bookingResponse = createBooking.data;
  const referenceCode = bookingResponse?.reference_code;
  const checkUrl = bookingResponse?.check_url;
  const selectedSlot = allSlots.find((s) => s.time === selectedTime) ?? null;
  const selectedLocalDate = selectedSlot ? formatIsoDate(selectedSlot.time_iso) : selectedDate;
  const selectedLocalTime = selectedSlot ? formatIsoTime(selectedSlot.time_iso) : formatTime(selectedTime);
  const selectedLocalEnd = selectedSlot ? formatIsoTime(selectedSlot.end_time_iso) : '';

  if (step === 'done') {
    return (
      <BookingDoneScreen
        businessName={info.business_name || info.board_name}
        selectedLocalDate={selectedLocalDate}
        selectedLocalTime={selectedLocalTime}
        selectedLocalEnd={selectedLocalEnd}
        referenceCode={referenceCode}
        checkUrl={checkUrl}
        meetingLink={info.meeting_link}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 text-center">
        {info.logo_path ? (
          <img src={avatarUrl(info.logo_path) ?? ''} alt="" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover shadow-lg" />
        ) : (
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
        )}
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
          <BookingDateTimeStep
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            selectedTime={selectedTime}
            onTimeSelect={setSelectedTime}
            slotsLoading={slotsLoading}
            slots={allSlots}
            today={today}
            maxDate={maxDate}
            canProceed={canProceedToDetails}
            onNext={handleNext}
          />
        )}

        {step === 'details' && (
          <BookingDetailsStep
            selectedLocalDate={selectedLocalDate}
            selectedLocalTime={selectedLocalTime}
            selectedLocalEnd={selectedLocalEnd}
            name={name}
            onNameChange={setName}
            email={email}
            onEmailChange={setEmail}
            phone={phone}
            onPhoneChange={setPhone}
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            meetingLink={meetingLink}
            onMeetingLinkChange={setMeetingLink}
            notes={notes}
            onNotesChange={setNotes}
            canSubmit={canSubmit}
            submitting={createBooking.isPending}
            onBack={() => setStep('datetime')}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
