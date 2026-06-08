import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { PlatformUser, UserAccountStatus } from '../api/PlatformTypes';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import { NotificationChannelPicker } from './NotificationChannelPicker';
import {
  USER_ACCOUNT_STATUSES,
  USER_STATUS_REASON_MAX,
  USER_STATUS_LABELS,
  validateUserStatusReason,
  resolveUserStatus,
} from '../api/platformUserValidation';

export interface PlatformUserStatusModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (status: UserAccountStatus, reason: string, channel: NotificationChannel) => void;
}

export function PlatformUserStatusModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserStatusModalProps) {
  const isBulk = users.length > 1;
  const single = users[0] ?? null;
  const singleStatus = single ? resolveUserStatus(single) : 'active';

  const [status, setStatus] = useState<UserAccountStatus>('warning');
  const [reason, setReason] = useState('');
  const [channel, setChannel] = useState<NotificationChannel>('both');
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validation = useMemo(() => validateUserStatusReason(reason), [reason]);
  const showReasonError = (touched || submitAttempted) && Boolean(validation.errors.reason);
  const canSubmit = validation.valid && users.length > 0;

  useEffect(() => {
    if (open && single) {
      const next = USER_ACCOUNT_STATUSES.find((s) => s !== singleStatus) ?? 'warning';
      setStatus(next);
      setReason('');
      setTouched(false);
      setSubmitAttempted(false);
      setChannel('both');
    } else if (open) {
      setStatus('warning');
      setReason('');
      setTouched(false);
      setSubmitAttempted(false);
      setChannel('both');
    }
  }, [open, single?.id, singleStatus, users.length]);

  if (!open || users.length === 0) return null;

  const trimmed = reason.trim();

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched(true);
    if (!validation.valid) return;
    onConfirm(status, trimmed, channel);
  };

  const title = isBulk
    ? `Update status for ${users.length} users`
    : `Change status — ${single?.name}`;

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
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-status-modal-title"
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
              <div className="p-2.5 rounded-full shrink-0 bg-indigo-50">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="user-status-modal-title" className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isBulk
                    ? 'Notify selected users via in-app, email, or both. Restricted and deactivated accounts cannot sign in.'
                    : `Current status: ${USER_STATUS_LABELS[singleStatus]}. Choose how to deliver the status update.`}
                </p>
              </div>
            </div>

            {isBulk && (
              <ul className="mt-4 max-h-28 overflow-y-auto text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg divide-y divide-gray-100">
                {users.map((u) => (
                  <li key={u.id} className="px-3 py-2 flex justify-between gap-2">
                    <span className="truncate font-medium">{u.name}</span>
                    <span className="shrink-0 text-gray-400">{USER_STATUS_LABELS[resolveUserStatus(u)]}</span>
                  </li>
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
                <label htmlFor="user-status-target" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New status <span className="text-red-500">*</span>
                </label>
                <select
                  id="user-status-target"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
                  disabled={isPending}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {USER_ACCOUNT_STATUSES.map((s) => (
                    <option key={s} value={s} disabled={!isBulk && singleStatus === s}>
                      {USER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="user-status-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="user-status-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, USER_STATUS_REASON_MAX))}
                  onBlur={() => setTouched(true)}
                  rows={4}
                  disabled={isPending}
                  aria-invalid={showReasonError}
                  placeholder="Explain why this status is being applied..."
                  className={cn(
                    'w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 disabled:bg-gray-50',
                    showReasonError
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-gray-200 focus:ring-blue-500/30',
                  )}
                />
                <div className="flex flex-col gap-1 mt-1.5">
                  <p className="text-xs text-gray-400">{trimmed.length}/{USER_STATUS_REASON_MAX}</p>
                  {showReasonError && (
                    <p className="text-xs text-red-600" role="alert">{validation.errors.reason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  This action is audited. Restricted and deactivated statuses block sign-in for the user account.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isPending || !canSubmit}
                  className={cn(
                    'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isPending ? 'Saving...' : isBulk ? `Update ${users.length} users` : 'Confirm change'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
