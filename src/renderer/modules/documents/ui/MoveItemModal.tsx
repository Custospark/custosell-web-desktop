import { useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder } from '../api/documentTypes';
import { ChevronRight, Folder } from 'lucide-react';

function flattenFolders(folders: DocumentFolder[]): DocumentFolder[] {
  const out: DocumentFolder[] = [];
  const walk = (nodes: DocumentFolder[]) => {
    nodes.forEach((node) => {
      out.push(node);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(folders);
  return out;
}

function collectDescendantIds(folderId: number, flat: DocumentFolder[]): Set<number> {
  const byParent = new Map<number | null, DocumentFolder[]>();
  flat.forEach((folder) => {
    const key = folder.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  });

  const blocked = new Set<number>([folderId]);
  const walk = (id: number) => {
    (byParent.get(id) ?? []).forEach((child) => {
      blocked.add(child.id);
      walk(child.id);
    });
  };
  walk(folderId);
  return blocked;
}

interface MoveItemModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tree: DocumentFolder[];
  movingFolderId?: number | null;
  onConfirm: (targetFolderId: number | null) => void;
  loading?: boolean;
}

export function MoveItemModal({
  open,
  onClose,
  title,
  tree,
  movingFolderId = null,
  onConfirm,
  loading = false,
}: MoveItemModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null);

  const flat = useMemo(() => flattenFolders(tree), [tree]);
  const blockedIds = useMemo(
    () => (movingFolderId ? collectDescendantIds(movingFolderId, flat) : new Set<number>()),
    [movingFolderId, flat],
  );

  const options = useMemo(() => {
    return flat.filter((folder) => !blockedIds.has(folder.id) && folder.can_manage !== false);
  }, [flat, blockedIds]);

  return (
    <Modal isOpen={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Choose a destination folder. Root level moves the item outside any folder.</p>

        <button
          type="button"
          onClick={() => setTargetId(null)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm',
            targetId === null ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300',
          )}
        >
          <Folder className="h-4 w-4 text-gray-500" />
          Root level
        </button>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {options.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setTargetId(folder.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm',
                targetId === folder.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300',
              )}
              style={{ paddingLeft: `${12 + (folder.depth - 1) * 14}px` }}
            >
              {folder.depth > 1 && <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />}
              <Folder className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={loading} onClick={() => onConfirm(targetId)}>Move here</Button>
        </div>
      </div>
    </Modal>
  );
}
