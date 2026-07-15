import { Palette } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { FOLDER_PRESET_COLORS } from '../../../shared/utils/surfaceStyles';
import type { DocumentFolder } from '../api/documentTypes';
import { resolveFolderColor } from '../api/documentColorUtils';
import { DocumentFormSection, DocumentModalFooter, DocumentModalHero } from './documentFormFields';
import PipelineColorPicker from '../../pipeline/ui/PipelineColorPicker';

interface DocumentFolderColorModalProps {
  folder: DocumentFolder | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (color: string) => void;
}

export function DocumentFolderColorModal({
  folder,
  onClose,
  onSave,
}: DocumentFolderColorModalProps) {
  if (!folder) return null;

  const current = resolveFolderColor(folder);

  return (
    <Modal isOpen={Boolean(folder)} onClose={onClose} title="Folder color" subtitle={folder.name} size="md">
      <div className="space-y-5">
        <DocumentModalHero
          icon={Palette}
          title="Pick an accent color"
          description="Shown on this folder in the explorer and detail pane."
          tone="indigo"
        />

        <DocumentFormSection title="Color palette" icon={Palette}>
          <PipelineColorPicker
            value={current}
            presets={FOLDER_PRESET_COLORS}
            swatchSize="md"
            onChange={onSave}
            allowClear={false}
          />
        </DocumentFormSection>

        <DocumentModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </DocumentModalFooter>
      </div>
    </Modal>
  );
}
