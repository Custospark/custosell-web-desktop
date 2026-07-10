import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';

interface RenameItemModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  initialName: string;
  label?: string;
  loading?: boolean;
  onConfirm: (name: string) => void;
}

function RenameForm({
  initialName,
  label,
  loading,
  onClose,
  onConfirm,
}: Pick<RenameItemModalProps, 'initialName' | 'label' | 'loading' | 'onClose' | 'onConfirm'>) {
  const [name, setName] = useState(initialName);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName.trim()) {
      onClose();
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label ?? 'Name'}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          autoFocus
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" loading={loading} disabled={!name.trim()} onClick={handleSubmit}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function RenameItemModal({
  open,
  onClose,
  title,
  initialName,
  label = 'Name',
  loading = false,
  onConfirm,
}: RenameItemModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && (
        <RenameForm
          key={`${title}-${initialName}`}
          initialName={initialName}
          label={label}
          loading={loading}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
}
