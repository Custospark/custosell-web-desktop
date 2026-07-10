import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import {
  DocumentFormSection,
  DocumentIconField,
  DocumentModalFooter,
  documentInputClass,
} from './documentFormFields';

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
    <div className="space-y-5">
      <DocumentFormSection title="Rename" icon={Pencil}>
        <DocumentIconField label={label ?? 'Name'} icon={Pencil} required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            className={documentInputClass}
            autoFocus
          />
        </DocumentIconField>
      </DocumentFormSection>

      <DocumentModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" loading={loading} disabled={!name.trim()} onClick={handleSubmit}>
          Save
        </Button>
      </DocumentModalFooter>
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
    <Modal isOpen={open} onClose={onClose} title={title} size="md">
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
