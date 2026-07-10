import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { DocumentAccessSection } from './DocumentAccessSection';
import { CABINET_ACCESS_OPTIONS } from './cabinetMeta';
import type { CabinetVisibility, DocumentUserRef } from '../api/documentTypes';
import {
  cabinetMemberPayload,
  useCreateDocumentCabinet,
} from '../api/useDocumentCabinetQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Archive } from 'lucide-react';

interface CreateCabinetModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (cabinetId: number) => void;
}

export default function CreateCabinetModal({ open, onClose, onCreated }: CreateCabinetModalProps) {
  const navigate = useNavigate();
  const createCabinet = useCreateDocumentCabinet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CabinetVisibility>('all_staff');
  const [members, setMembers] = useState<DocumentUserRef[]>([]);
  const [coverColor, setCoverColor] = useState('#6366f1');

  if (!open) return null;

  const reset = () => {
    setName('');
    setDescription('');
    setVisibility('all_staff');
    setMembers([]);
    setCoverColor('#6366f1');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (visibility === 'selected_staff' && members.length === 0) return;

    try {
      const cabinet = await createCabinet.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        cover_color: coverColor,
        ...cabinetMemberPayload(members),
      });
      handleClose();
      if (onCreated) {
        onCreated(cabinet.id);
      } else {
        navigate(ROUTES.DOCUMENTS.CABINET(cabinet.id));
      }
    } catch {
      // Toast handled by mutation
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="New cabinet">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: coverColor }}>
            <Archive className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">Document cabinet</p>
            <p className="text-xs text-gray-600">A scoped vault for folders and files with its own access rules.</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Finance, HR, Projects"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Accent color</span>
          <input
            type="color"
            value={coverColor}
            onChange={(e) => setCoverColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
          />
        </label>

        <DocumentAccessSection
          visibility={visibility}
          onVisibilityChange={(value) => setVisibility(value as CabinetVisibility)}
          selectedMembers={members}
          onSelectedMembersChange={setMembers}
          allowInherit={false}
          visibilityOptions={CABINET_ACCESS_OPTIONS}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || createCabinet.isPending || (visibility === 'selected_staff' && members.length === 0)}
          >
            Create cabinet
          </Button>
        </div>
      </div>
    </Modal>
  );
}
