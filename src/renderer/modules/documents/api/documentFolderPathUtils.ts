import type { DocumentFolder, DocumentItem } from './documentTypes';
import { documentPrimaryLabel } from './documentDisplayUtils';

export function flattenDocumentFolders(folders: DocumentFolder[]): DocumentFolder[] {
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

export function collectFolderDescendantIds(folderId: number, flat: DocumentFolder[]): Set<number> {
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

export function buildFolderPathFromBreadcrumbs(
  breadcrumbs: { id: number; name: string }[],
  folderName?: string | null,
): string {
  const segments = breadcrumbs.map((crumb) => crumb.name);
  if (folderName) segments.push(folderName);
  return segments.join('/');
}

export function buildFolderPathById(
  folderId: number | null | undefined,
  foldersById: Map<number, DocumentFolder>,
): string | null {
  if (folderId == null) return null;

  const segments: string[] = [];
  let currentId: number | null = folderId;
  const visited = new Set<number>();

  while (currentId != null && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = foldersById.get(currentId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentId = folder.parent_id;
  }

  return segments.length > 0 ? segments.join('/') : null;
}

export function formatDocumentHoverPath(doc: DocumentItem, inlineFolderPath?: string | null): string {
  const fileName = documentPrimaryLabel(doc);
  const folderPath = inlineFolderPath ?? doc.folder_path ?? null;
  if (!folderPath) return fileName;
  return `${folderPath}/${fileName}`;
}

export function canMoveFolderInto(
  draggedFolderId: number,
  targetFolderId: number | null,
  flatFolders: DocumentFolder[],
): boolean {
  if (targetFolderId == null) return true;
  if (draggedFolderId === targetFolderId) return false;
  return !collectFolderDescendantIds(draggedFolderId, flatFolders).has(targetFolderId);
}
