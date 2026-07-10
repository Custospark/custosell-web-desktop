import { useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderInput } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder } from '../api/documentTypes';
import { collectFolderDescendantIds, flattenDocumentFolders } from '../api/documentFolderPathUtils';
import { DocumentFormSection, DocumentModalFooter, DocumentModalHero } from './documentFormFields';

interface MoveItemModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tree: DocumentFolder[];
  movingFolderId?: number | null;
  allowRoot?: boolean;
  onConfirm: (targetFolderId: number | null) => void;
  loading?: boolean;
}

export function MoveItemModal({
  open,
  onClose,
  title,
  tree,
  movingFolderId = null,
  allowRoot = true,
  onConfirm,
  loading = false,
}: MoveItemModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null);

  const flat = useMemo(() => flattenDocumentFolders(tree), [tree]);
  const blockedIds = useMemo(
    () => (movingFolderId ? collectFolderDescendantIds(movingFolderId, flat) : new Set<number>()),
    [movingFolderId, flat],
  );

  const options = useMemo(() => {
    // Folder moves require manage on the destination; document moves need contribute.
    return flat.filter((folder) => {
      if (blockedIds.has(folder.id)) return false;
      if (movingFolderId != null) return folder.can_manage !== false;
      return folder.can_contribute !== false;
    });
  }, [flat, blockedIds, movingFolderId]);

  return (
    <Modal isOpen={open} onClose={onClose} title={title} subtitle="Choose where to move this item." size="lg">
      <div className="space-y-5">
        <DocumentModalHero
          icon={FolderInput}
          title="Move to folder"
          description="Root level places the item outside any folder in this cabinet."
          tone="slate"
        />

        <DocumentFormSection title="Destination" icon={Folder}>
          {allowRoot && (
            <button
              type="button"
              onClick={() => setTargetId(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                targetId === null ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <Folder className="h-4 w-4 text-gray-500" />
              Root level
            </button>
          )}

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {options.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setTargetId(folder.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                  targetId === folder.id ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:border-gray-300',
                )}
                style={{ paddingLeft: `${12 + (folder.depth - 1) * 14}px` }}
              >
                {folder.depth > 1 && <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />}
                <Folder className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        </DocumentFormSection>

        <DocumentModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            loading={loading}
            disabled={!allowRoot && targetId === null}
            onClick={() => onConfirm(targetId)}
          >
            Move here
          </Button>
        </DocumentModalFooter>
      </div>
    </Modal>
  );
}
