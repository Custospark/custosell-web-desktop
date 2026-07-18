import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
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

  if (!open || businesses.length === 0) return null;

  const isBulk = businesses.length > 1;

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
          >
            <button type="button" onClick={onClose} disabled={isPending} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-2.5 rounded-full shrink-0 bg-amber-50">
                <RefreshCw className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step === 'first' ? `Wipe data for ${businessName}?` : 'Type to confirm'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {step === 'first'
                    ? 'This will delete all sales, orders, invoices, payments, products, inventory, customers, expenses, and accounting records. Estimates, CRM (pipeline), and documents are preserved.'
                    : `Type "${expectedText}" below to confirm you want to wipe all transactional data.`}
                </p>
              </div>
            </div>

            {isBulk && step === 'first' && (
              <ul className="mt-4 max-h-24 overflow-y-auto text-xs text-gray-600 bg-gray-50 border rounded-lg divide-y">
                {businesses.map((b) => (
                  <li key={b.id} className="px-3 py-2 truncate">{b.name}</li>
                ))}
              </ul>
            )}

            {step === 'first' && (
              <>
                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800">
                      <strong>Data deleted permanently:</strong> sales, orders, invoices, payments, products, inventory, customers, expenses, accounting.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      <strong>Preserved:</strong> estimates, CRM (pipeline/boards/leads), documents, users, roles, and business settings.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setStep('second')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'second' && (
              <form className="mt-5" onSubmit={(e) => { e.preventDefault(); setSubmitAttempted(true); if (canConfirmSecond) onConfirm(); }} noValidate>
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">
                    This action permanently deletes all transactional data and cannot be undone.
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{expectedText}</code> to confirm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isPending}
                  autoFocus
                  placeholder={expectedText}
                  className={cn(
                    'w-full border rounded-lg px-3 py-2 text-sm font-mono',
                    submitAttempted && !canConfirmSecond ? 'border-red-500' : 'border-gray-200',
                  )}
                />
                {submitAttempted && !canConfirmSecond && (
                  <p className="text-xs text-red-600 mt-1">Type the exact confirmation text above.</p>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="secondary" onClick={() => setStep('first')} disabled={isPending}>Back</Button>
                  <button
                    type="submit"
                    disabled={isPending || !canConfirmSecond}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {isPending ? 'Wiping...' : `Wipe data`}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
