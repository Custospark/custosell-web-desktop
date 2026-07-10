import { useState } from 'react';
import { Mail, WifiOff } from 'lucide-react';
import { Modal } from '../modals/Modal';
import { Button } from '../buttons/Button';
import { Input } from '../inputs/Input';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useEmailVaultFile, useEmailVaultFolder, type SendDocumentEmailResult } from '../../hooks/useVaultEmail';
import { useDocumentStaffPicker } from '../../../modules/documents/api/useDocumentStaffPicker';
import { emailSentLabel } from './EmailSentCountBadge';

export type VaultEmailKind = 'vault_file' | 'vault_folder';

interface SendVaultEmailModalProps {
  open: boolean;
  onClose: () => void;
  kind: VaultEmailKind;
  targetId: number;
  targetLabel: string;
  emailSentCount?: number;
  onSent?: (result: SendDocumentEmailResult) => void;
}

const COPY: Record<VaultEmailKind, { title: string; description: string }> = {
  vault_file: {
    title: 'Email file',
    description: 'Send this file as an attachment to a team member or external recipient.',
  },
  vault_folder: {
    title: 'Email folder',
    description: 'Send this folder as a zip attachment to a team member or external recipient.',
  },
};

export default function SendVaultEmailModal({
  open,
  onClose,
  kind,
  targetId,
  targetLabel,
  emailSentCount = 0,
  onSent,
}: SendVaultEmailModalProps) {
  const copy = COPY[kind];
  const { isCompletelyOffline } = useNetworkStatus();
  const emailFile = useEmailVaultFile();
  const emailFolder = useEmailVaultFolder();
  const { data: staff = [], isLoading: staffLoading } = useDocumentStaffPicker(open);
  const isPending = emailFile.isPending || emailFolder.isPending;

  const [recipientMode, setRecipientMode] = useState<'staff' | 'external'>('staff');
  const [staffUserId, setStaffUserId] = useState<number | ''>('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [toError, setToError] = useState<string | undefined>();
  const [prevOpen, setPrevOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRecipientMode('staff');
      setStaffUserId('');
      setTo('');
      setMessage('');
      setToError(undefined);
    }
  }

  const offline = isCompletelyOffline;
  const cannotSend = offline || targetId <= 0;

  const staffWithEmail = staff.filter((member) => {
    const email = (member as { email?: string | null }).email;
    return typeof email === 'string' && email.trim().length > 0;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cannotSend || isPending) return;

    let trimmedTo = to.trim();
    if (recipientMode === 'staff') {
      const selected = staffWithEmail.find((member) => member.id === staffUserId);
      trimmedTo = selected ? String((selected as { email?: string }).email ?? '').trim() : '';
    }

    if (!trimmedTo) {
      setToError(recipientMode === 'staff' ? 'Select a team member with an email address' : 'Enter a recipient email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      setToError('Enter a valid email address');
      return;
    }

    setToError(undefined);
    const payload = { to: trimmedTo, message: message.trim() || undefined };

    try {
      const result = kind === 'vault_file'
        ? await emailFile.mutateAsync({ id: targetId, payload })
        : await emailFolder.mutateAsync({ id: targetId, payload });
      onSent?.(result);
      onClose();
    } catch {
      /* toast handled in hooks */
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={copy.title} size="md">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">{targetLabel}</p>
          <p className="mt-2 text-xs text-blue-700/80">{copy.description}</p>
          {emailSentCount > 0 && (
            <p className="mt-2 text-xs font-medium text-violet-700">{emailSentLabel(emailSentCount)}</p>
          )}
        </div>

        {offline && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Connect to the internet to send email.</span>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Recipient</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setRecipientMode('staff'); setToError(undefined); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${recipientMode === 'staff' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
            >
              Team member
            </button>
            <button
              type="button"
              onClick={() => { setRecipientMode('external'); setToError(undefined); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${recipientMode === 'external' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600'}`}
            >
              External email
            </button>
          </div>
        </div>

        {recipientMode === 'staff' ? (
          <div className="space-y-1">
            <label htmlFor="vault-email-staff" className="block text-sm font-medium text-gray-700">Team member</label>
            <select
              id="vault-email-staff"
              value={staffUserId}
              onChange={(e) => {
                setStaffUserId(e.target.value ? Number(e.target.value) : '');
                setToError(undefined);
              }}
              disabled={cannotSend || isPending || staffLoading}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="">Select staff…</option>
              {staffWithEmail.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({(member as { email?: string }).email})
                </option>
              ))}
            </select>
            {staffWithEmail.length === 0 && !staffLoading && (
              <p className="text-xs text-amber-700">No staff with email addresses found. Use external email instead.</p>
            )}
          </div>
        ) : (
          <Input
            label="Send to"
            type="email"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (toError) setToError(undefined);
            }}
            placeholder="recipient@example.com"
            error={toError}
            disabled={cannotSend || isPending}
            autoComplete="email"
          />
        )}

        {toError && recipientMode === 'staff' && (
          <p className="text-sm text-red-600">{toError}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="vault-email-message" className="block text-sm font-medium text-gray-700">
            Message <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="vault-email-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={cannotSend || isPending}
            placeholder="Add a short note…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={cannotSend}>
            <Mail className="mr-1.5 h-4 w-4" />
            Send email
          </Button>
        </div>
      </form>
    </Modal>
  );
}
