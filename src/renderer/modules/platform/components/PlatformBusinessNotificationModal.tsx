import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Mail, MessageSquareText, Send, Type } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection, PipelineIconField, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import { NotificationChannelPicker } from './NotificationChannelPicker';
import type { BusinessNotificationIntention, PlatformBusiness } from '../api/PlatformTypes';
import {
  BUSINESS_NOTIFY_MESSAGE_MAX,
  BUSINESS_NOTIFY_SUBJECT_MAX,
  NOTIFICATION_INTENTIONS,
  validateBusinessNotifyMessage,
} from '../api/platformBusinessValidation';

export interface PlatformBusinessNotificationModalProps {
  open: boolean;
  businesses: PlatformBusiness[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (
    intention: BusinessNotificationIntention,
    message: string,
    subject: string,
    markAsNotified: boolean,
    channel: NotificationChannel,
  ) => void;
}

export function PlatformBusinessNotificationModal({
  open,
  businesses,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformBusinessNotificationModalProps) {
  const [intention, setIntention] = useState<BusinessNotificationIntention>('announcement');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [markAsNotified, setMarkAsNotified] = useState(true);
  const [channel, setChannel] = useState<NotificationChannel>('both');
  const [touched, setTouched] = useState<{ message: boolean; subject: boolean }>({ message: false, subject: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validation = useMemo(() => validateBusinessNotifyMessage(message, subject), [message, subject]);
  const showMessageError = (touched.message || submitAttempted) && Boolean(validation.errors.message);
  const showSubjectError = (touched.subject || submitAttempted) && Boolean(validation.errors.subject);
  const canSubmit = validation.valid && businesses.length > 0;

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

  const title = `Send notification to ${businesses.length} business${businesses.length === 1 ? '' : 'es'}`;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      subtitle="Reach owners and active staff via in-app alerts, email, or both"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Bell}
          tone="blue"
          title={businesses.length === 1 ? businesses[0].name : `${businesses.length} selected businesses`}
          description="One message is delivered per business - never duplicated on the same channel."
        />

        {businesses.length > 1 && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {businesses.map((b) => (
              <div key={b.id} className="truncate px-3 py-2 text-sm text-gray-700">
                {b.name} · {b.owner_email ?? b.email ?? '-'}
              </div>
            ))}
          </div>
        )}

        <PipelineFormSection title="Delivery channel" icon={Send} description="How should the owner and staff receive this?">
          <NotificationChannelPicker value={channel} onChange={setChannel} disabled={isPending} />
        </PipelineFormSection>

        <PipelineFormSection title="Message" icon={MessageSquareText} description="Intention and body of the notification.">
          <PipelineIconField label="Intention" icon={Mail} required>
            <select
              value={intention}
              onChange={(e) => setIntention(e.target.value as BusinessNotificationIntention)}
              disabled={isPending}
              className={pipelineSelectClass}
            >
              {NOTIFICATION_INTENTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </PipelineIconField>

          <div>
            <PipelineIconField label="Subject (optional)" icon={Type}>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, BUSINESS_NOTIFY_SUBJECT_MAX))}
                onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                disabled={isPending}
                placeholder="Leave blank for a default subject per intention"
                className={cn(
                  'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  showSubjectError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                )}
              />
            </PipelineIconField>
            {showSubjectError && <p className="mt-1 pl-10 text-xs text-red-600">{validation.errors.subject}</p>}
          </div>

          <div>
            <PipelineIconField label="Message" icon={MessageSquareText} required>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, BUSINESS_NOTIFY_MESSAGE_MAX))}
                onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                rows={5}
                disabled={isPending}
                placeholder="Write the message body for the selected channel(s)..."
                className={cn(
                  'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  showMessageError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                )}
              />
            </PipelineIconField>
            <div className="mt-1.5 flex flex-col gap-1 pl-10">
              <p className="text-xs text-gray-400">{message.trim().length}/{BUSINESS_NOTIFY_MESSAGE_MAX}</p>
              {showMessageError && <p className="text-xs text-red-600">{validation.errors.message}</p>}
            </div>
          </div>
        </PipelineFormSection>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <input
            type="checkbox"
            checked={markAsNotified}
            onChange={(e) => setMarkAsNotified(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs leading-relaxed text-blue-900">
            <strong className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Mark as notified</strong>
            Sets account status to &quot;Notified&quot; for tracking (login stays allowed). Use with the duration filter to
            find businesses notified ≥ 7/30/60/90 days ago.
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
            {isPending ? 'Sending...' : `Send to ${businesses.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
