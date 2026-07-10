import { useState } from 'react';
import { Archive, Palette, Shield, Type } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { DocumentAccessSection } from './DocumentAccessSection';
import { SurfaceAppearancePicker } from './SurfaceAppearancePicker';
import { CABINET_ACCESS_OPTIONS } from './cabinetMeta';
import {
  DocumentFormSection,
  DocumentModalFooter,
  DocumentModalHero,
} from './documentFormFields';
import type {
  CabinetVisibility,
  DocumentCabinet,
  DocumentUserRef,
  DocumentsVaultAppearance,
} from '../api/documentTypes';
import {
  cabinetMemberPayload,
  useUpdateDocumentCabinet,
} from '../api/useDocumentCabinetQueries';

interface CabinetSettingsModalProps {
  open: boolean;
  cabinet: DocumentCabinet;
  onClose: () => void;
  onSaved?: (cabinet: DocumentCabinet) => void;
}

function cabinetAppearance(cabinet: DocumentCabinet): DocumentsVaultAppearance {
  return {
    cover_color: cabinet.cover_color,
    background_type: cabinet.background_type ?? null,
    background_value: cabinet.background_value ?? null,
  };
}

function CabinetSettingsForm({
  cabinet,
  onClose,
  onSaved,
}: {
  cabinet: DocumentCabinet;
  onClose: () => void;
  onSaved?: (cabinet: DocumentCabinet) => void;
}) {
  const updateCabinet = useUpdateDocumentCabinet();
  const [name, setName] = useState(cabinet.name);
  const [description, setDescription] = useState(cabinet.description ?? '');
  const [visibility, setVisibility] = useState<CabinetVisibility>(cabinet.visibility);
  const [members, setMembers] = useState<DocumentUserRef[]>(cabinet.members ?? []);
  const [appearance, setAppearance] = useState<DocumentsVaultAppearance>(() => cabinetAppearance(cabinet));

  const handleSave = async () => {
    if (!name.trim()) return;
    if (visibility === 'selected_staff' && members.length === 0) return;

    try {
      const updated = await updateCabinet.mutateAsync({
        id: cabinet.id,
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        cover_color: appearance.cover_color ?? null,
        background_type: appearance.background_type ?? null,
        background_value: appearance.background_value ?? null,
        ...cabinetMemberPayload(members),
      });
      onSaved?.(updated);
      onClose();
    } catch {
      // Toast handled by mutation
    }
  };

  return (
    <div className="space-y-5">
      <DocumentModalHero
        icon={Archive}
        title={cabinet.name}
        description="Changes apply to this cabinet only. Folders and files stay in place when you rename."
        tone="indigo"
      />

      <DocumentFormSection
        title="Cabinet details"
        icon={Type}
        description="How this cabinet appears in the gallery and switcher."
      >
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-gray-700">Cabinet name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="e.g. Finance, HR, Operations"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-gray-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional note for your team"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      </DocumentFormSection>

      <DocumentFormSection
        title="Who can access"
        icon={Shield}
        description="Control which staff can open this cabinet and add files."
      >
        <DocumentAccessSection
          visibility={visibility}
          onVisibilityChange={(value) => setVisibility(value as CabinetVisibility)}
          selectedMembers={members}
          onSelectedMembersChange={setMembers}
          allowInherit={false}
          visibilityOptions={CABINET_ACCESS_OPTIONS}
        />
      </DocumentFormSection>

      <DocumentFormSection
        title="Canvas background"
        icon={Palette}
        description="Shown while browsing this cabinet. Leave as default to use the business vault style."
      >
        <SurfaceAppearancePicker
          appearance={appearance}
          onChange={setAppearance}
        />
      </DocumentFormSection>

      <DocumentModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          loading={updateCabinet.isPending}
          disabled={!name.trim() || (visibility === 'selected_staff' && members.length === 0)}
          onClick={() => void handleSave()}
        >
          Save settings
        </Button>
      </DocumentModalFooter>
    </div>
  );
}

export default function CabinetSettingsModal({
  open,
  cabinet,
  onClose,
  onSaved,
}: CabinetSettingsModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Cabinet settings"
      subtitle="Rename, control access, and customize the workspace canvas."
      size="xl"
    >
      {open && (
        <CabinetSettingsForm
          key={cabinet.id}
          cabinet={cabinet}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
