import { useMemo, useState } from 'react';
import { AlertTriangle, Hash, MessageSquareText, Send, Shield } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection, PipelineIconField, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
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

  const trimmed = reason.trim();

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched(true);
    if (!validation.valid) return;
    onConfirm(status, trimmed, channel);
  };

  const title = isBulk
    ? `Update status for ${users.length} users`
    : `Change status - ${single?.name}`;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      subtitle="Choose how to deliver the status update"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Shield}
          tone="indigo"
          title={isBulk ? 'Update several accounts' : `Current status: ${single ? USER_STATUS_LABELS[singleStatus] : '-'}`}
          description="Restricted and deactivated accounts cannot sign in. The change is audited and sent via the chosen channel."
        />

        {isBulk && (
          <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-sm font-medium text-gray-800">{u.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{USER_STATUS_LABELS[resolveUserStatus(u)]}</span>
              </div>
            ))}
          </div>
        )}

        <PipelineFormSection title="Delivery channel" icon={Send} description="How should this user receive the update?">
          <NotificationChannelPicker value={channel} onChange={setChannel} disabled={isPending} />
        </PipelineFormSection>

        <PipelineFormSection title="New status" icon={Shield} description="The account status applied to the selected user(s).">
          <PipelineIconField label="New status" icon={Shield} required>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
              disabled={isPending}
              className={pipelineSelectClass}
            >
              {USER_ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s} disabled={!isBulk && singleStatus === s}>
                  {USER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Reason" icon={MessageSquareText} description="Explain why this status is being applied.">
          <div>
            <PipelineIconField label="Reason" icon={Hash} required>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, USER_STATUS_REASON_MAX))}
                onBlur={() => setTouched(true)}
                rows={4}
                disabled={isPending}
                aria-invalid={showReasonError}
                placeholder="Explain why this status is being applied..."
                className={cn(
                  'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  showReasonError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                )}
              />
            </PipelineIconField>
            <div className="mt-1.5 flex flex-col gap-1 pl-10">
              <p className="text-xs text-gray-400">{trimmed.length}/{USER_STATUS_REASON_MAX}</p>
              {showReasonError && (
                <p className="text-xs text-red-600" role="alert">{validation.errors.reason}</p>
              )}
            </div>
          </div>
        </PipelineFormSection>

        <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            This action is audited. Restricted and deactivated statuses block sign-in for the user account.
          </p>
        </div>

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
            {isPending ? 'Saving...' : isBulk ? `Update ${users.length} users` : 'Confirm change'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}