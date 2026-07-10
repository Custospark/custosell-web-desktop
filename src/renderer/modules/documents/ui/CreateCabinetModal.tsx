import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Palette, Shield, Type } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { DocumentAccessSection } from './DocumentAccessSection';
import { CABINET_ACCESS_OPTIONS } from './cabinetMeta';
import {
  DocumentFormSection,
  DocumentIconField,
  DocumentModalFooter,
  DocumentModalHero,
  documentInputClass,
} from './documentFormFields';
import type { CabinetVisibility, DocumentUserRef } from '../api/documentTypes';
import {
  cabinetMemberPayload,
  useCreateDocumentCabinet,
} from '../api/useDocumentCabinetQueries';
import { ROUTES } from '../../../app/routes/constants/shared.paths';

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
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="New cabinet"
      subtitle="A scoped workspace for folders and files with its own access rules."
      size="lg"
    >
      <div className="space-y-5">
        <DocumentModalHero
          icon={Archive}
          title="Document cabinet"
          description="Group files by team or function — like HR, Finance, or client projects."
          tone="indigo"
        />

        <DocumentFormSection title="Cabinet details" icon={Type}>
          <DocumentIconField label="Name" icon={Type} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance, HR, Projects"
              className={documentInputClass}
              autoFocus
            />
          </DocumentIconField>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-700">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short note for your team"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <DocumentIconField label="Accent color" icon={Palette} hint="Used on the cabinet card and canvas accent.">
            <input
              type="color"
              value={coverColor}
              onChange={(e) => setCoverColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-1 py-1 shadow-sm"
            />
          </DocumentIconField>
        </DocumentFormSection>

        <DocumentFormSection title="Who can access" icon={Shield}>
          <DocumentAccessSection
            visibility={visibility}
            onVisibilityChange={(value) => setVisibility(value as CabinetVisibility)}
            selectedMembers={members}
            onSelectedMembersChange={setMembers}
            allowInherit={false}
            visibilityOptions={CABINET_ACCESS_OPTIONS}
          />
        </DocumentFormSection>

        <DocumentModalFooter>
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || createCabinet.isPending || (visibility === 'selected_staff' && members.length === 0)}
          >
            Create cabinet
          </Button>
        </DocumentModalFooter>
      </div>
    </Modal>
  );
}
