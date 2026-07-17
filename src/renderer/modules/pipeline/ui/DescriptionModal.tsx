import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import DescriptionEditor from './DescriptionEditor';

interface DescriptionModalProps {
  open: boolean;
  title: string;
  content: string;
  onSave: (html: string) => void;
  onClose: () => void;
}

export default function DescriptionModal({ open, title, content, onSave, onClose }: DescriptionModalProps) {
  const [html, setHtml] = useState(content);

  const handleSave = () => {
    onSave(html);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={`Edit description — ${title}`} size="2xl">
      <div className="flex min-h-0 flex-1 flex-col gap-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
        <div className="min-h-0 flex-1">
          <DescriptionEditor
            content={html}
            onChange={setHtml}
            placeholder="Write a detailed description…"
            editable
            fillHeight
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
