import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { PlatformUser } from '../api/PlatformTypes';
import {
  USER_STATUS_REASON_MAX,
  validateUserStatusReason,
} from '../api/platformUserValidation';

export interface PlatformUserDeleteModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function PlatformUserDeleteModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserDeleteModalProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validation = useMemo(() => validateUserStatusReason(reason), [reason]);
  const showReasonError = (touched || submitAttempted) && Boolean(validation.errors.reason);
  const canSubmit = validation.valid && users.length > 0;

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
      setSubmitAttempted(false);
    }
  }, [open, users.map((u) => u.id).join(',')]);

  if (!open || users.length === 0) return null;

  const isBulk = users.length > 1;

  const handleSubmit = () => {
    setSubmitAttempted(true);
    setTouched(true);
    if (!validation.valid) return;
    onConfirm(reason.trim());
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
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
          >
            <button type="button" onClick={onClose} disabled={isPending} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-2.5 rounded-full shrink-0 bg-red-50">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete {isBulk ? `${users.length} users` : users[0].name}?
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Soft-deletes the user account. Business owners and the last platform admin cannot be deleted.
                  This action is audited.
                </p>
              </div>
            </div>

            {isBulk && (
              <ul className="mt-4 max-h-24 overflow-y-auto text-xs text-gray-600 bg-gray-50 border rounded-lg divide-y">
                {users.map((u) => (
                  <li key={u.id} className="px-3 py-2 truncate">{u.name} · {u.email}</li>
                ))}
              </ul>
            )}

            <form className="mt-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, USER_STATUS_REASON_MAX))}
                onBlur={() => setTouched(true)}
                rows={3}
                disabled={isPending}
                className={cn('w-full border rounded-lg px-3 py-2 text-sm', showReasonError ? 'border-red-500' : 'border-gray-200')}
              />
              {showReasonError && <p className="text-xs text-red-600 mt-1">{validation.errors.reason}</p>}

              <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">Deleted users cannot sign in. Their business data is retained.</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
                <button
                  type="submit"
                  disabled={isPending || !canSubmit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {isPending ? 'Deleting...' : `Delete ${users.length}`}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
