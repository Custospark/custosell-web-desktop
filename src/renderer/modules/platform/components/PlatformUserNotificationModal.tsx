import { useMemo, useState } from 'react';
import { Bell, Hash, Mail, Send, Type } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection, PipelineIconField, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import { NotificationChannelPicker } from './NotificationChannelPicker';
import type { PlatformUser, UserNotificationIntention } from '../api/PlatformTypes';
import {
  USER_NOTIFY_MESSAGE_MAX,
  USER_NOTIFY_SUBJECT_MAX,
  USER_NOTIFICATION_INTENTIONS,
  validateUserNotifyMessage,
} from '../api/platformUserValidation';

export interface PlatformUserNotificationModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (
    intention: UserNotificationIntention,
    message: string,
    subject: string,
    markAsNotified: boolean,
    channel: NotificationChannel,
  ) => void;
}

export function PlatformUserNotificationModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserNotificationModalProps) {
  const [intention, setIntention] = useState<UserNotificationIntention>('announcement');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [markAsNotified, setMarkAsNotified] = useState(true);
  const [channel, setChannel] = useState<NotificationChannel>('both');
  const [touched, setTouched] = useState<{ message: boolean; subject: boolean }>({ message: false, subject: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validation = useMemo(() => validateUserNotifyMessage(message, subject), [message, subject]);
  const showMessageError = (touched.message || submitAttempted) && Boolean(validation.errors.message);
  const showSubjectError = (touched.subject || submitAttempted) && Boolean(validation.errors.subject);
  const canSubmit = validation.valid && users.length > 0;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched({ message: true, subject: true });
    if (!validation.valid) return;
    onConfirm(intention, message.trim(), subject.trim(), markAsNotified, channel);
  };

  const countLabel = `${users.length} user${users.length === 1 ? '' : 's'}`;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={`Send notification to ${countLabel}`}
      subtitle="Reach users via in-app alerts, email, or both"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Bell}
          tone="blue"
          title={`Send to ${countLabel}`}
          description="Choose the delivery channel and compose the message. Recipients can be marked as notified for follow-up tracking."
        />

        {users.length > 1 && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="px-3 py-2 truncate text-sm text-gray-800">{u.name} · {u.email}</div>
            ))}
          </div>
        )}

        <PipelineFormSection title="Delivery channel" icon={Send} description="How should the recipients receive this message?">
          <NotificationChannelPicker value={channel} onChange={setChannel} disabled={isPending} />
        </PipelineFormSection>

        <PipelineFormSection title="Message" icon={Mail} description="Intention, subject, and body of the notification.">
          <div>
            <PipelineIconField label="Intention" icon={Hash}>
              <select
                value={intention}
                onChange={(e) => setIntention(e.target.value as UserNotificationIntention)}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                {USER_NOTIFICATION_INTENTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>

          <div>
            <PipelineIconField label="Subject" icon={Type}>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, USER_NOTIFY_SUBJECT_MAX))}
                onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                disabled={isPending}
                placeholder="Leave blank for a default subject per intention"
                aria-invalid={showSubjectError}
                className={cn(
                  'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  showSubjectError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                )}
              />
            </PipelineIconField>
            {showSubjectError && <p className="mt-1 pl-10 text-xs text-red-600" role="alert">{validation.errors.subject}</p>}
          </div>

          <div>
            <PipelineIconField label="Message" icon={Mail} required>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, USER_NOTIFY_MESSAGE_MAX))}
                onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                rows={5}
                disabled={isPending}
                placeholder="Write the message body for the selected channel(s)..."
                aria-invalid={showMessageError}
                className={cn(
                  'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  showMessageError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                )}
              />
            </PipelineIconField>
            <div className="mt-1.5 flex flex-col gap-1 pl-10">
              <p className="text-xs text-gray-400">{message.trim().length}/{USER_NOTIFY_MESSAGE_MAX}</p>
              {showMessageError && (
                <p className="text-xs text-red-600" role="alert">{validation.errors.message}</p>
              )}
            </div>
          </div>
        </PipelineFormSection>

        <label className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={markAsNotified}
            onChange={(e) => setMarkAsNotified(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs leading-relaxed text-blue-900">
            <strong>Mark as notified</strong> - sets account status to &quot;Notified&quot; for tracking (login stays allowed).
            Use with the duration filter to find users notified ≥ 7/30/60/90 days ago.
          </span>
        </label>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {isPending ? 'Sending...' : `Send to ${users.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}