import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import { NotificationChannelPicker } from './NotificationChannelPicker';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
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

  useEffect(() => {
    if (open) {
      setIntention('announcement');
      setSubject('');
      setMessage('');
      setMarkAsNotified(true);
      setChannel('both');
      setTouched({ message: false, subject: false });
      setSubmitAttempted(false);
    }
  }, [open, businesses.map((b) => b.id).join(',')]);

  if (!open || businesses.length === 0) return null;

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched({ message: true, subject: true });
    if (!validation.valid) return;
    onConfirm(intention, message.trim(), subject.trim(), markAsNotified, channel);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={isPending ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-2.5 rounded-full shrink-0 bg-blue-50">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Send notification to {businesses.length} business{businesses.length === 1 ? '' : 'es'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Reach owners and active staff via in-app alerts, email, or both.
                </p>
              </div>
            </div>

            {businesses.length > 1 && (
              <ul className="mt-4 max-h-24 overflow-y-auto text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg divide-y divide-gray-100">
                {businesses.map((b) => (
                  <li key={b.id} className="px-3 py-2 truncate">{b.name} · {b.owner_email ?? b.email ?? '—'}</li>
                ))}
              </ul>
            )}

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              noValidate
            >
              <NotificationChannelPicker value={channel} onChange={setChannel} disabled={isPending} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Intention</label>
                <select
                  value={intention}
                  onChange={(e) => setIntention(e.target.value as BusinessNotificationIntention)}
                  disabled={isPending}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {NOTIFICATION_INTENTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject (optional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, BUSINESS_NOTIFY_SUBJECT_MAX))}
                  onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                  disabled={isPending}
                  placeholder="Leave blank for a default subject per intention"
                  className={cn(
                    'w-full border rounded-lg px-3 py-2 text-sm',
                    showSubjectError ? 'border-red-500' : 'border-gray-200',
                  )}
                />
                {showSubjectError && <p className="text-xs text-red-600 mt-1">{validation.errors.subject}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, BUSINESS_NOTIFY_MESSAGE_MAX))}
                  onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                  rows={5}
                  disabled={isPending}
                  placeholder="Write the message body for the selected channel(s)..."
                  className={cn(
                    'w-full border rounded-lg px-3 py-2 text-sm',
                    showMessageError ? 'border-red-500' : 'border-gray-200',
                  )}
                />
                <p className="text-xs text-gray-400 mt-1">{message.trim().length}/{BUSINESS_NOTIFY_MESSAGE_MAX}</p>
                {showMessageError && <p className="text-xs text-red-600 mt-1">{validation.errors.message}</p>}
              </div>

              <label className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsNotified}
                  onChange={(e) => setMarkAsNotified(e.target.checked)}
                  disabled={isPending}
                  className="mt-0.5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-xs text-blue-900 leading-relaxed">
                  <strong>Mark as notified</strong> — sets account status to &quot;Notified&quot; for tracking (login stays allowed).
                  Use with the duration filter to find businesses notified ≥ 7/30/60/90 days ago.
                </span>
              </label>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
                <button
                  type="submit"
                  disabled={isPending || !canSubmit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isPending ? 'Sending...' : `Send to ${businesses.length}`}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
