import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import type { PlatformUser } from '../api/PlatformTypes';
import { parseUserEmails } from '../api/platformUserValidation';
import { usePlatformRoles } from '../api/PlatformQueries';
import { selectClass, textareaClass } from '../../../shared/utils/inputStyles';

export interface PlatformUserRoleModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (payload: { emails?: string[]; ids?: number[]; role: string; action: 'assign' | 'revoke' }) => void;
}

export function PlatformUserRoleModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserRoleModalProps) {
  const { data: roles = [] } = usePlatformRoles();
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState('');
  const [action, setAction] = useState<'assign' | 'revoke'>('assign');
  const [touched, setTouched] = useState(false);

  const parsedExtraEmails = useMemo(() => parseUserEmails(emailInput), [emailInput]);

  useEffect(() => {
    if (open) {
      setEmailInput('');
      setAction('assign');
      setTouched(false);
      if (roles.length > 0) {
        setRole(roles[0].name);
      }
    }
  }, [open, users.map((u) => u.id).join(','), roles]);

  if (!open) return null;

  const hasTargets = users.length > 0 || parsedExtraEmails.length > 0;
  const canSubmit = Boolean(role) && hasTargets;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm({
      emails: parsedExtraEmails.length > 0 ? parsedExtraEmails : undefined,
      ids: users.length > 0 ? users.map((u) => u.id) : undefined,
      role,
      action,
    });
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
            className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg"
            role="dialog"
            aria-modal="true"
          >
            <button type="button" onClick={onClose} disabled={isPending} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-2.5 rounded-full shrink-0 bg-indigo-50">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Platform role</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Assign or revoke a platform operator role by email. Selected table rows are included automatically.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate>
              {users.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Selected users ({users.length})</p>
                  <ul className="max-h-20 overflow-y-auto text-xs text-gray-600 bg-gray-50 border rounded-lg divide-y">
                    {users.map((u) => (
                      <li key={u.id} className="px-3 py-2 truncate">{u.name} · {u.email}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional emails
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onBlur={() => setTouched(true)}
                  rows={3}
                  disabled={isPending}
                  placeholder="Paste emails separated by commas or new lines"
                  className={textareaClass}
                />
                {parsedExtraEmails.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{parsedExtraEmails.length} email(s) parsed</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isPending || roles.length === 0}
                    className={selectClass}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as 'assign' | 'revoke')}
                    disabled={isPending}
                    className={selectClass}
                  >
                    <option value="assign">Assign role</option>
                    <option value="revoke">Revoke role</option>
                  </select>
                </div>
              </div>

              {touched && !hasTargets && (
                <p className="text-xs text-red-600">Select users or enter at least one email.</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
                <Button type="submit" disabled={isPending || !canSubmit}>
                  {isPending ? 'Saving...' : action === 'assign' ? 'Assign role' : 'Revoke role'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
