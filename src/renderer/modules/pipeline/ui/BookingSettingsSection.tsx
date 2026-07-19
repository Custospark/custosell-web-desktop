import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Copy, RefreshCw, Kanban } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useBookingSettings, useUpdateBookingSettings, useRegenerateBookingToken, bookingKeys } from '../api/useBookingQueries';
import { PipelineFormSection, pipelineInputClass } from './pipelineFormFields';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { PipelineStage } from '../api/pipelineTypes';

const ALL_DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const BREAK_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
];

interface BookingSettingsSectionProps {
  boardId: number;
  stages: PipelineStage[];
  canManage: boolean;
}

export default function BookingSettingsSection({ boardId, stages, canManage }: BookingSettingsSectionProps) {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data: settingsData, isLoading } = useBookingSettings(boardId);
  const updateSettings = useUpdateBookingSettings(boardId);

  const patchEnabled = useMutation({
    mutationFn: async (newEnabled: boolean) => {
      const { data } = await axiosInstance.put(
        `/pipeline/boards/${boardId}/booking-settings`,
        { enabled: newEnabled },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.settings(boardId) });
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update booking setting'));
    },
  });
  const regenerateToken = useRegenerateBookingToken(boardId);

  const settings = settingsData?.data;
  const token = settings?.token ?? '';

  const [f, setF] = useState({
    enabled: false,
    availableDays: [1, 2, 3, 4, 5] as number[],
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    breakDuration: 0,
    maxSlotsPerDay: 10,
    meetingTitlePrefix: '',
    meetingLink: '',
    targetStageId: null as number | null,
    dirty: false,
  });

  const initRef = useRef(false);
  useEffect(() => {
    if (settings && !initRef.current) {
      initRef.current = true;
      setF({
        enabled: Boolean(settings.enabled),
        availableDays: settings.available_days ?? [1, 2, 3, 4, 5],
        startTime: settings.start_time ?? '09:00',
        endTime: settings.end_time ?? '17:00',
        slotDuration: settings.slot_duration ?? 30,
        breakDuration: settings.break_duration ?? 0,
        maxSlotsPerDay: settings.max_slots_per_day ?? 10,
        meetingTitlePrefix: settings.meeting_title_prefix ?? '',
        meetingLink: settings.meeting_link ?? '',
        targetStageId: settings.target_stage_id ?? null,
        dirty: false,
      });
    }
  }, [settings]);

  const upd = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch, dirty: true }));

  const toggleDay = (day: number) => {
    setF((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day].sort(),
      dirty: true,
    }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      enabled: f.enabled,
      available_days: f.availableDays,
      start_time: f.startTime,
      end_time: f.endTime,
      slot_duration: f.slotDuration,
      break_duration: f.breakDuration,
      max_slots_per_day: f.maxSlotsPerDay,
      meeting_title_prefix: f.meetingTitlePrefix,
      meeting_link: f.meetingLink || undefined,
      target_stage_id: f.targetStageId ?? undefined,
    });
    setF((prev) => ({ ...prev, dirty: false }));
  };

  const handleCopyLink = useCallback(async () => {
    const link = `${window.location.origin}/book/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('success', 'Booking link copied!');
    } catch {
      showToast('error', 'Could not copy link');
    }
  }, [token, showToast]);

  const handleRegenerate = async () => {
    await regenerateToken.mutateAsync();
  };

  const bookingUrl = settings?.booking_url ?? `${window.location.origin}/book/${token}`;

  if (isLoading) {
    return (
      <PipelineFormSection title="Public booking" icon={Calendar}>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-400">Loading booking settings...</p>
        </div>
      </PipelineFormSection>
    );
  }

  return (
    <PipelineFormSection title="Public booking" icon={Calendar}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Enable public booking</p>
            <p className="text-xs text-gray-400">
              Let people book meetings without logging in
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={f.enabled}
              onChange={() => {
                const newVal = !f.enabled;
                setF((prev) => ({ ...prev, enabled: newVal }));
                patchEnabled.mutate(newVal);
              }}
              disabled={!canManage}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-disabled:opacity-50" />
          </label>
        </div>

        {f.enabled && (
          <>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">Available days</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => { if (canManage) toggleDay(day.value); }}
                    disabled={!canManage}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      f.availableDays.includes(day.value)
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    } disabled:opacity-50`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Start time</label>
                <input
                  type="time"
                  value={f.startTime}
                  onChange={(e) => upd({ startTime: e.target.value })}
                  disabled={!canManage}
                  className={pipelineInputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">End time</label>
                <input
                  type="time"
                  value={f.endTime}
                  onChange={(e) => upd({ endTime: e.target.value })}
                  disabled={!canManage}
                  className={pipelineInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Slot duration</label>
                <select
                  value={f.slotDuration}
                  onChange={(e) => upd({ slotDuration: Number(e.target.value) })}
                  disabled={!canManage}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Max per day</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={f.maxSlotsPerDay}
                  onChange={(e) => upd({ maxSlotsPerDay: Number(e.target.value) })}
                  disabled={!canManage}
                  className={pipelineInputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Break between slots</label>
              <select
                value={f.breakDuration}
                onChange={(e) => upd({ breakDuration: Number(e.target.value) })}
                disabled={!canManage}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
              >
                {BREAK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-0.5 text-xs text-gray-400">
                Gap between consecutive booking slots
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Meeting title prefix
              </label>
              <input
                type="text"
                value={f.meetingTitlePrefix}
                onChange={(e) => upd({ meetingTitlePrefix: e.target.value })}
                placeholder="e.g. Consultation: "
                disabled={!canManage}
                className={pipelineInputClass}
              />
              <p className="mt-0.5 text-xs text-gray-400">
                Cards will be named: &ldquo;{f.meetingTitlePrefix || 'Booking: '}Visitor Name&rdquo;
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                <svg className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Meeting link (Google Meet, Zoom, etc.)
              </label>
              <input
                type="url"
                value={f.meetingLink}
                onChange={(e) => upd({ meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                disabled={!canManage}
                className={pipelineInputClass}
              />
              <p className="mt-0.5 text-xs text-gray-400">
                Visitors will see this link after booking
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                <Kanban className="mr-1 inline-block h-3.5 w-3.5 text-indigo-400" />
                Place new cards in column
              </label>
              <select
                value={f.targetStageId ?? ''}
                onChange={(e) => upd({ targetStageId: e.target.value ? Number(e.target.value) : null })}
                disabled={!canManage}
                className={pipelineInputClass}
              >
                <option value="">First column (default)</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            {f.dirty && canManage && (
              <Button
                type="button"
                onClick={handleSave}
                loading={updateSettings.isPending}
                size="sm"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Save availability
              </Button>
            )}
          </>
        )}

        {token && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <p className="mb-1.5 text-xs font-medium text-indigo-700">Booking link</p>
            <p className="mb-2 text-xs text-indigo-500">
              Share this link so people can book meetings on this board:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="flex-1 rounded-md border border-indigo-200 bg-white px-2.5 py-2 text-xs text-indigo-800"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                title="Copy link"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                loading={regenerateToken.isPending}
                title="Regenerate link"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PipelineFormSection>
  );
}