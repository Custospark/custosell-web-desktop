import {
  useMemo, useState,
} from 'react';
import { AlertTriangle, LockKeyhole } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../buttons/Button';
import { inputClass } from '../../utils/inputStyles';

interface TypeToConfirmModalProps {
  open: boolean;
  onClose: () => void;
  /** Title shown in the header, e.g. "Delete estimate EST-0001". */
  title: string;
  /** Short subtitle under the title. */
  subtitle?: string;
  /** The exact text the user must type to enable deletion. */
  keyword: string;
  /** Optional label for the keyword - defaults to "Reference". */
  keywordLabel?: string;
  /** Body copy describing the consequences. */
  message?: string;
  /** Loading state for the confirm button (mutation pending). */
  isDeleting?: boolean;
  onConfirm: () => void;
  confirmLabel?: string;
}

/**
 * Shared destructive confirmation modal. Requires the user to type the record
 * reference (e.g. "EST-0001") before the delete button is enabled - mirrors the
 * Business Settings account-delete flow, but without sending a security code.
 */
export function TypeToConfirmModal({
  open,
  onClose,
  title,
  subtitle,
  keyword,
  keywordLabel = 'Reference',
  message = 'This action is permanent and cannot be undone.',
  isDeleting,
  onConfirm,
  confirmLabel = 'Delete permanently',
}: TypeToConfirmModalProps) {
  const [value, setValue] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue('');
  }

  const matches = useMemo(
    () => keyword.trim().length > 0 && value.trim().toLowerCase() === keyword.trim().toLowerCase(),
    [keyword, value],
  );

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={title}
      subtitle={subtitle}
      size="md"
      panelClassName="border-t-4 border-t-red-500"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p className="text-sm leading-relaxed text-red-900">
            {message}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Type <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-red-600">{keyword}</code> to confirm
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={keyword}
            autoFocus
            autoComplete="off"
            disabled={isDeleting}
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
            {keywordLabel} must match exactly
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={!matches || isDeleting}
              loading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}