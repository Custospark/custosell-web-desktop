import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { DocumentAccessSection } from './DocumentAccessSection';
import { SurfaceAppearancePicker } from './SurfaceAppearancePicker';
import { CABINET_ACCESS_OPTIONS } from './cabinetMeta';
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
import { cn } from '../../../shared/utils/cn';

type SettingsTab = 'details' | 'access' | 'canvas';

interface CabinetSettingsModalProps {
  open: boolean;
  cabinet: DocumentCabinet;
  initialTab?: SettingsTab;
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

export default function CabinetSettingsModal({
  open,
  cabinet,
  initialTab = 'details',
  onClose,
  onSaved,
}: CabinetSettingsModalProps) {
  const updateCabinet = useUpdateDocumentCabinet();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [name, setName] = useState(cabinet.name);
  const [description, setDescription] = useState(cabinet.description ?? '');
  const [visibility, setVisibility] = useState<CabinetVisibility>(cabinet.visibility);
  const [members, setMembers] = useState<DocumentUserRef[]>(cabinet.members ?? []);
  const [appearance, setAppearance] = useState<DocumentsVaultAppearance>(() => cabinetAppearance(cabinet));

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setName(cabinet.name);
    setDescription(cabinet.description ?? '');
    setVisibility(cabinet.visibility);
    setMembers(cabinet.members ?? []);
    setAppearance(cabinetAppearance(cabinet));
  }, [cabinet, initialTab, open]);

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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'access', label: 'Access' },
    { id: 'canvas', label: 'Canvas' },
  ];

  return (
    <Modal isOpen={open} onClose={onClose} title="Cabinet settings" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                tab === item.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Cabinet name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <p className="text-xs text-gray-500">
              Starter cabinets can be renamed to match your company — folders and files stay put.
            </p>
          </div>
        )}

        {tab === 'access' && (
          <DocumentAccessSection
            visibility={visibility}
            onVisibilityChange={(value) => setVisibility(value as CabinetVisibility)}
            selectedMembers={members}
            onSelectedMembersChange={setMembers}
            allowInherit={false}
            visibilityOptions={CABINET_ACCESS_OPTIONS}
          />
        )}

        {tab === 'canvas' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Canvas background applies when browsing this cabinet. If unset, the business vault default is used.
            </p>
            <SurfaceAppearancePicker
              key={`${cabinet.id}-${appearance.cover_color}-${appearance.background_type}-${appearance.background_value}`}
              appearance={appearance}
              onChange={setAppearance}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            loading={updateCabinet.isPending}
            disabled={!name.trim() || (visibility === 'selected_staff' && members.length === 0)}
            onClick={() => void handleSave()}
          >
            Save settings
          </Button>
        </div>
      </div>
    </Modal>
  );
}
