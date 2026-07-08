import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { formatShiftDateTime } from '../../../shared/utils/formatDateTime';
import {
  useCancelLeadReminder,
  useCreateLeadReminder,
  useLeadReminders,
} from '../api/usePipelineCollaborationQueries';
import { pipelineInputClass } from './pipelineFormFields';
import { Bell, Clock, Trash2 } from 'lucide-react';

interface LeadRemindersPanelProps {
  leadId: number;
  boardId?: number;
  canContribute?: boolean;
}

export default function LeadRemindersPanel({ leadId, boardId, canContribute = false }: LeadRemindersPanelProps) {
  const { data: reminders = [] } = useLeadReminders(leadId);
  const createReminder = useCreateLeadReminder(leadId, boardId);
  const cancelReminder = useCancelLeadReminder(leadId);
  const [remindAt, setRemindAt] = useState('');
  const [message, setMessage] = useState('');

  const pending = reminders.filter((r) => !r.sent_at && !r.cancelled_at);

  return (
    <div className="space-y-4">
      {canContribute ? (
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
        <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Schedule a reminder
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Remind at</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className={pipelineInputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Message (optional)</label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should we remind you about?"
              className={pipelineInputClass}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          loading={createReminder.isPending}
          disabled={!remindAt}
          onClick={() => {
            void createReminder.mutateAsync({
              remind_at: new Date(remindAt).toISOString(),
              message: message.trim() || undefined,
              channel: 'both',
            }).then(() => {
              setRemindAt('');
              setMessage('');
            });
          }}
        >
          <Clock className="h-4 w-4 mr-1.5" />
          Set reminder (email + in-app)
        </Button>
      </div>
      ) : (
        <p className="text-xs text-gray-500">Viewers cannot schedule reminders on this card.</p>
      )}

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {formatShiftDateTime(reminder.remind_at)}
                </p>
                {reminder.message && (
                  <p className="truncate text-xs text-gray-500">{reminder.message}</p>
                )}
              </div>
              {canContribute && (
              <button
                type="button"
                onClick={() => void cancelReminder.mutate(reminder.id)}
                className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
