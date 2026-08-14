import { useMemo, useState } from 'react';
import { AlertTriangle, Hash, MessageSquareText, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection, PipelineIconField } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
import type { PlatformBusiness } from '../api/PlatformTypes';
import {
  BUSINESS_STATUS_REASON_MAX,
  validateBusinessStatusReason,
} from '../api/platformBusinessValidation';

export interface PlatformBusinessDeleteModalProps {
  open: boolean;
  businesses: PlatformBusiness[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function PlatformBusinessDeleteModal({
  open,
  businesses,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformBusinessDeleteModalProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validation = useMemo(() => validateBusinessStatusReason(reason), [reason]);
  const showReasonError = (touched || submitAttempted) && Boolean(validation.errors.reason);
  const canSubmit = validation.valid && businesses.length > 0;

  const isBulk = businesses.length > 1;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched(true);
    if (!validation.valid) return;
    onConfirm(reason.trim());
  };

  const title = `Delete ${isBulk ? `${businesses.length} businesses` : businesses[0]?.name ?? 'business'}?`;

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      subtitle="This action is audited and cannot be undone"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Trash2}
          tone="red"
          title={isBulk ? `Delete ${businesses.length} businesses` : businesses[0]?.name ?? 'Delete business'}
          description="Permanently deletes the business and all associated data - sales, products, customers, staff, and settings."
        />

        {isBulk && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {businesses.map((b) => (
              <div key={b.id} className="truncate px-3 py-2 text-sm text-gray-700">
                {b.name}
              </div>
            ))}
          </div>
        )}

        <PipelineFormSection title="Reason" icon={MessageSquareText} description="Explain why this deletion is happening.">
          <PipelineIconField label="Reason" icon={Hash} required>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, BUSINESS_STATUS_REASON_MAX))}
              onBlur={() => setTouched(true)}
              rows={3}
              disabled={isPending}
              aria-invalid={showReasonError}
              placeholder="Explain why this business is being deleted..."
              className={cn(
                'w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                showReasonError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
              )}
            />
          </PipelineIconField>
          <div className="mt-1.5 flex flex-col gap-1 pl-10">
            <p className="text-xs text-gray-400">{reason.trim().length}/{BUSINESS_STATUS_REASON_MAX}</p>
            {showReasonError && (
              <p className="text-xs text-red-600" role="alert">{validation.errors.reason}</p>
            )}
          </div>
        </PipelineFormSection>

        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs leading-relaxed text-red-800">
            All data for the selected business(es) will be permanently deleted. This includes sales, products,
            customers, staff, settings, and all associated records.
          </p>
        </div>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {isPending ? 'Deleting...' : `Delete ${businesses.length}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
