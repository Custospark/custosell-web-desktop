import { CalendarDays, Clock, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { TimeSlot } from '../api/useBookingQueries';
import { formatSlotRange } from './bookingFormatHelpers';

interface BookingDateTimeStepProps {
  selectedDate: string;
  onDateChange: (value: string) => void;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  slotsLoading: boolean;
  slots: TimeSlot[];
  today: string;
  maxDate: string;
  canProceed: boolean;
  onNext: () => void;
}

export default function BookingDateTimeStep({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeSelect,
  slotsLoading,
  slots,
  today,
  maxDate,
  canProceed,
  onNext,
}: BookingDateTimeStepProps) {
  return (
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
          onChange={(e) => onDateChange(e.target.value)}
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
          ) : slots.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No slots available for this date. Pick another day.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => {
                const isTaken = !slot.available;
                const isSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={isTaken}
                    onClick={() => onTimeSelect(slot.time)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-all',
                      isTaken
                        ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                        : isSelected
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50',
                    )}
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
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
