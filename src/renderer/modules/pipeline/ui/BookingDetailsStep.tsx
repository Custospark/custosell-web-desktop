import type { FormEvent } from 'react';
import { CalendarDays, Clock, Link, Loader2, Mail, MessageSquare, Phone, User } from 'lucide-react';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import CountryCodePicker from './CountryCodePicker';

interface BookingDetailsStepProps {
  selectedLocalDate: string;
  selectedLocalTime: string;
  selectedLocalEnd: string;
  name: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  countryCode: CountryCode;
  onCountryCodeChange: (code: CountryCode) => void;
  meetingLink: string;
  onMeetingLinkChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (e: FormEvent) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-shadow placeholder:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export default function BookingDetailsStep({
  selectedLocalDate,
  selectedLocalTime,
  selectedLocalEnd,
  name,
  onNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  countryCode,
  onCountryCodeChange,
  meetingLink,
  onMeetingLinkChange,
  notes,
  onNotesChange,
  canSubmit,
  submitting,
  onBack,
  onSubmit,
}: BookingDetailsStepProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-600">2</div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
          <p className="text-xs text-gray-400">How can we reach you?</p>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2 text-xs text-indigo-600">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{selectedLocalDate}</span>
        <Clock className="h-3.5 w-3.5" />
        <span>{selectedLocalTime}{selectedLocalEnd ? ` - ${selectedLocalEnd}` : ''}</span>
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
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="John Doe"
            className={inputClass}
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
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="john@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            <Phone className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
            Phone number
          </label>
          <div className="flex gap-2">
            <CountryCodePicker value={countryCode} onChange={onCountryCodeChange} />
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="700 000 000"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          {phone && (
            <p className="mt-1 text-xs text-gray-400">Full number: {countryCode.dial_code} {phone}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            <Link className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
            Meeting link <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => onMeetingLinkChange(e.target.value)}
            placeholder="https://meet.google.com/xxx"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-gray-400">Optional - add a video link so the host can join online</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">
            <MessageSquare className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
            Meeting notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            placeholder="Agenda, topics, or anything else..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
          Confirm booking
        </button>
      </div>
    </form>
  );
}
