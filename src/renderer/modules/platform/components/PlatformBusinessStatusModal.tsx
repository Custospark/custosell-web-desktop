import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Ban, CheckCircle, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import type { PlatformBusiness } from '../api/PlatformTypes';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 1000;

export interface PlatformBusinessStatusModalProps {
  open: boolean;
  business: PlatformBusiness | null;
  nextStatus: 'active' | 'suspended' | null;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function PlatformBusinessStatusModal({
  open,
  business,
  nextStatus,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformBusinessStatusModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const suspending = nextStatus === 'suspended';

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open, business?.id, nextStatus]);

  if (!business || !nextStatus) return null;

  const trimmed = reason.trim();
  const isValid = trimmed.length >= MIN_REASON_LENGTH;

  const handleSubmit = () => {
    if (!isValid) {
      setError(`Please enter a reason (at least ${MIN_REASON_LENGTH} characters).`);
      return;
    }
    onConfirm(trimmed);
  };

  const Icon = suspending ? Ban : CheckCircle;
  const iconBg = suspending ? 'bg-red-50' : 'bg-green-50';
  const iconColor = suspending ? 'text-red-500' : 'text-green-600';
  const confirmBg = suspending ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

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
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="business-status-modal-title"
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
              <div className={`p-2.5 rounded-full shrink-0 ${iconBg}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="business-status-modal-title" className="text-lg font-semibold text-gray-900">
                  {suspending ? 'Suspend Business' : 'Reactivate Business'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {suspending ? (
                    <>
                      Suspend <strong className="text-gray-800">{business.name}</strong>? The owner and all staff
                      will be blocked from signing in. An email with your reason will be sent to the business owner.
                    </>
                  ) : (
                    <>
                      Reactivate <strong className="text-gray-800">{business.name}</strong>? The owner and staff
                      can sign in again. An email with your reason will be sent to the business owner.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="business-status-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="business-status-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value.slice(0, MAX_REASON_LENGTH));
                  if (error) setError('');
                }}
                rows={4}
                disabled={isPending}
                placeholder={
                  suspending
                    ? 'e.g. Policy violation, unpaid subscription, fraudulent activity...'
                    : 'e.g. Issue resolved, payment received, account verified...'
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-gray-400">
                  {trimmed.length}/{MAX_REASON_LENGTH} · included in the email to{' '}
                  {business.owner_email ?? business.email ?? 'the owner'}
                </p>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                This action is audited. The reason is required and will be shared with the business owner by email.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !isValid}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmBg}`}
              >
                {isPending ? 'Saving...' : suspending ? 'Confirm Suspend' : 'Confirm Reactivate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
