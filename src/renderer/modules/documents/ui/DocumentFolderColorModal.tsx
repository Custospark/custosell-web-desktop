import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { FOLDER_PRESET_COLORS } from '../../../shared/utils/surfaceStyles';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder } from '../api/documentTypes';
import { resolveFolderColor } from '../api/documentColorUtils';

interface DocumentFolderColorModalProps {
  folder: DocumentFolder | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (color: string) => void;
}

export function DocumentFolderColorModal({
  folder,
  saving = false,
  onClose,
  onSave,
}: DocumentFolderColorModalProps) {
  if (!folder) return null;

  const current = resolveFolderColor(folder);

  return (
    <Modal isOpen={Boolean(folder)} onClose={onClose} title={`Folder color — ${folder.name}`}>
      <p className="mb-4 text-sm text-gray-600">
        Pick an accent color for this folder in the explorer and detail pane.
      </p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {FOLDER_PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onSave(color)}
            disabled={saving}
            className={cn(
              'h-10 w-10 rounded-xl ring-2 ring-offset-2 transition hover:scale-105',
              current === color ? 'ring-indigo-500' : 'ring-transparent',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
