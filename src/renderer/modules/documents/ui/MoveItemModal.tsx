import { useMemo, useState } from 'react';
import { FolderInput, Archive, Folder } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import type { DocumentCabinet } from '../api/documentTypes';
import { useDocumentFolderTree } from '../api/useDocumentQueries';
import { collectFolderDescendantIds, flattenDocumentFolders } from '../api/documentFolderPathUtils';
import { DocumentFormSection, DocumentModalFooter, DocumentModalHero, documentSelectClass } from './documentFormFields';

interface MoveItemModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  cabinets: DocumentCabinet[];
  currentCabinetId?: number;
  movingFolderId?: number | null;
  allowRoot?: boolean;
  onConfirm: (target: { cabinetId: number; folderId: number | null }) => void;
  loading?: boolean;
}

/**
 * Move item across cabinets. The destination cabinet is chosen first (a
 * dropdown), then only that cabinet's folders / subfolders are offered in a
 * second dropdown - mirroring how picking a board limits the stages you can
 * move a card/lead/task into.
 */
export function MoveItemModal({
  open,
  onClose,
  title,
  cabinets,
  currentCabinetId,
  movingFolderId = null,
  allowRoot = true,
  onConfirm,
  loading = false,
}: MoveItemModalProps) {
  const [targetCabinetId, setTargetCabinetId] = useState<number | null>(currentCabinetId ?? null);
  const [targetFolderId, setTargetFolderId] = useState<number | null>(null);

  // Fetch ONLY the selected cabinet's folder tree, so the folder options are
  // scoped to the chosen destination cabinet.
  const { data: tree = [] } = useDocumentFolderTree(targetCabinetId ?? undefined, open && targetCabinetId != null);

  const flat = useMemo(() => flattenDocumentFolders(tree), [tree]);
  const blockedIds = useMemo(
    () => (movingFolderId ? collectFolderDescendantIds(movingFolderId, flat) : new Set<number>()),
    [movingFolderId, flat],
  );

  const options = useMemo(() => {
    // Both file and folder moves resolve the full nested subtree. The backend
    // requires contributor access to the destination cabinet, so use the same
    // can_contribute flag for both - can_manage is stricter and would hide
    // valid nested destination folders when moving a folder.
    return flat.filter((folder) => {
      if (blockedIds.has(folder.id)) return false;
      return folder.can_contribute !== false;
    });
  }, [flat, blockedIds]);

  const targetCabinet =
    cabinets.find((c) => c.id === targetCabinetId) ?? cabinets.find((c) => c.id === currentCabinetId) ?? null;

  const handleCabinetChange = (cabinetId: number) => {
    setTargetCabinetId(cabinetId);
    // Switching cabinet resets the folder selection - the new cabinet has its
    // own folder tree, so any previously chosen folder id is meaningless.
    setTargetFolderId(null);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title} subtitle="Choose a cabinet, then a folder inside it to move this item to." size="lg">
      <div className="space-y-5">
        <DocumentModalHero
          icon={FolderInput}
          title="Move to cabinet / folder"
          description="Pick a destination cabinet, then a folder inside it. Root level places the item outside any folder."
          tone="slate"
        />

        <DocumentFormSection title="Destination cabinet" icon={Archive}>
          <select
            className={documentSelectClass}
            value={targetCabinetId ?? ''}
            onChange={(e) => handleCabinetChange(Number(e.target.value))}
            title="Destination cabinet"
          >
            {cabinets.map((cabinet) => (
              <option key={cabinet.id} value={cabinet.id}>
                {cabinet.name}
                {cabinet.id === currentCabinetId ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-400">
            Only the folders of the selected cabinet are shown below.
          </p>
        </DocumentFormSection>

        <DocumentFormSection title="Destination folder" icon={Folder}>
          <select
            className={documentSelectClass}
            value={targetFolderId ?? ''}
            onChange={(e) => setTargetFolderId(e.target.value === '' ? null : Number(e.target.value))}
            title="Destination folder"
            disabled={!targetCabinet}
          >
            {allowRoot && <option value="">Root level of {targetCabinet?.name ?? 'this cabinet'}</option>}
            {options.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {'\u00A0'.repeat(Math.max(0, folder.depth - 1) * 3)}
                {folder.depth > 1 ? '\u2514 ' : ''}
                {folder.name}
              </option>
            ))}
          </select>
          {options.length === 0 && (
            <p className="mt-1.5 text-xs text-gray-400">
              No folders available in this cabinet{allowRoot ? ' - you can still move to its root level.' : '.'}
            </p>
          )}
        </DocumentFormSection>

        <DocumentModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            loading={loading}
            disabled={!targetCabinet || (!allowRoot && targetFolderId === null)}
            onClick={() => {
              if (!targetCabinet) return;
              onConfirm({ cabinetId: targetCabinet.id, folderId: targetFolderId });
            }}
          >
            Move here
          </Button>
        </DocumentModalFooter>
      </div>
    </Modal>
  );
}