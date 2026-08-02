import { useState } from 'react';
import { AlertTriangle, Check, Database, FileText, RefreshCw } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { cn } from '../../../shared/utils/cn';
import { PipelineFormSection } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
import type { PlatformBusiness } from '../api/PlatformTypes';

export interface PlatformBusinessResetModalProps {
  open: boolean;
  businesses: PlatformBusiness[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PlatformBusinessResetModal({
  open,
  businesses,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformBusinessResetModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [step, setStep] = useState<'first' | 'second'>('first');

  const businessName = businesses.length === 1 ? businesses[0].name : `${businesses.length} businesses`;
  const confirmationKeyword = businesses.length === 1
    ? businesses[0].name.toLowerCase().replace(/\s+/g, '-')
    : `wipe-${businesses.length}`;
  const expectedText = `/reset ${confirmationKeyword}`;
  const canConfirmSecond = confirmText === expectedText;

  const isBulk = businesses.length > 1;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleConfirm = () => {
    setSubmitAttempted(true);
    if (canConfirmSecond) onConfirm();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={`Wipe data for ${businessName}?`}
      subtitle="Transactional data is removed — estimates, CRM, and documents are preserved"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={RefreshCw}
          tone="red"
          title={step === 'first' ? `Wipe data for ${businessName}?` : 'Type to confirm'}
          description={
            step === 'first'
              ? 'All sales, orders, invoices, payments, products, inventory, customers, expenses, and accounting records are permanently removed.'
              : `Type "${expectedText}" below to confirm you want to wipe all transactional data.`
          }
        />

        {isBulk && step === 'first' && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
            {businesses.map((b) => (
              <div key={b.id} className="truncate px-3 py-2 text-sm text-gray-700">
                {b.name}
              </div>
            ))}
          </div>
        )}

        {step === 'first' && (
          <>
            <div className="space-y-3">
              <PipelineFormSection title="Data deleted permanently" icon={Database} description="Removed from the business entirely.">
                <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs leading-relaxed text-red-800">
                    sales, orders, invoices, payments, products, inventory, customers, expenses, accounting.
                  </p>
                </div>
              </PipelineFormSection>

              <PipelineFormSection title="Preserved" icon={FileText} description="Kept intact for a fresh start.">
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-xs leading-relaxed text-blue-800">
                    estimates, CRM (pipeline/boards/leads), documents, users, roles, and business settings.
                  </p>
                </div>
              </PipelineFormSection>
            </div>

            <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep('second')}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto bg-amber-600 hover:bg-amber-700"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'second' && (
          <>
            <PipelineFormSection title="Confirm wipe" icon={RefreshCw} description="This cannot be undone.">
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-xs leading-relaxed text-red-800">
                  This action permanently deletes all transactional data and cannot be undone.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Type <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{expectedText}</code> to confirm{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isPending}
                  autoFocus
                  placeholder={expectedText}
                  className={cn(
                    'w-full rounded-lg border bg-white px-3 py-2.5 font-mono text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50',
                    submitAttempted && !canConfirmSecond
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
                  )}
                />
                {submitAttempted && !canConfirmSecond && (
                  <p className="mt-1 text-xs text-red-600">Type the exact confirmation text above.</p>
                )}
              </div>
            </PipelineFormSection>

            <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" onClick={() => setStep('first')} disabled={isPending} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                variant="danger"
                loading={isPending}
                disabled={isPending || !canConfirmSecond}
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Check className="h-4 w-4" />
                {isPending ? 'Wiping...' : 'Wipe data'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
