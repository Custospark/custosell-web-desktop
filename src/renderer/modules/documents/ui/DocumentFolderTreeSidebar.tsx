import { useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { truncateDisplayName } from '../api/documentDisplayUtils';
import type { DocumentFolder } from '../api/documentTypes';
import { useDocumentFolderChildren } from '../api/useDocumentQueries';
import { ChevronDown, ChevronRight, Folder, FolderOpen, HardDrive } from 'lucide-react';

interface DocumentFolderTreeSidebarProps {
  activeFolderId: number | null;
  expandFolderIds?: number[];
  dropTargetFolderId: number | 'panel' | null;
  onSelectFolder: (folderId: number | null) => void;
  onFolderDragOver: (folderId: number, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number, e: React.DragEvent) => void;
}

function LazyTreeNode({
  folder,
  depth,
  activeFolderId,
  expandFolderIds,
  dropTargetFolderId,
  expandedIds,
  toggleExpanded,
  onSelectFolder,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: {
  folder: DocumentFolder;
  depth: number;
  activeFolderId: number | null;
  expandFolderIds: Set<number>;
  dropTargetFolderId: number | 'panel' | null;
  expandedIds: Set<number>;
  toggleExpanded: (id: number) => void;
  onSelectFolder: (folderId: number | null) => void;
  onFolderDragOver: (folderId: number, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number, e: React.DragEvent) => void;
}) {
  const expanded = expandedIds.has(folder.id) || expandFolderIds.has(folder.id);
  const hasChildren = folder.has_children ?? false;
  const active = activeFolderId === folder.id;
  const isDropTarget = dropTargetFolderId === folder.id;
  const displayName = truncateDisplayName(folder.name, 36);

  const { data: childrenPage } = useDocumentFolderChildren(folder.id, 1, expanded && hasChildren);
  const children = childrenPage?.data ?? [];

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg pr-2 transition-colors',
          active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-700 hover:bg-gray-100',
          isDropTarget && 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onDragOver={(e) => onFolderDragOver(folder.id, e)}
        onDragLeave={onFolderDragLeave}
        onDrop={(e) => onFolderDrop(folder.id, e)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-white/60"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(folder.id);
            }}
            aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-7 w-7 shrink-0" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm"
          onClick={() => onSelectFolder(folder.id)}
          title={folder.name}
        >
          {active ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-amber-600" />
          )}
          <span className="truncate font-medium">{displayName}</span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <LazyTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              expandFolderIds={expandFolderIds}
              dropTargetFolderId={dropTargetFolderId}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onSelectFolder={onSelectFolder}
              onFolderDragOver={onFolderDragOver}
              onFolderDragLeave={onFolderDragLeave}
              onFolderDrop={onFolderDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentFolderTreeSidebar({
  activeFolderId,
  expandFolderIds = [],
  dropTargetFolderId,
  onSelectFolder,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: DocumentFolderTreeSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const expandSet = useMemo(() => new Set(expandFolderIds), [expandFolderIds]);

  const { data: rootPage, isLoading } = useDocumentFolderChildren(null, 1, true);
  const rootFolders = rootPage?.data ?? [];

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergedExpanded = useMemo(() => {
    const merged = new Set(expandedIds);
    expandSet.forEach((id) => merged.add(id));
    return merged;
  }, [expandSet, expandedIds]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-gray-200 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Folders</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <button
          type="button"
          className={cn(
            'mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
            activeFolderId === null ? 'bg-indigo-100 text-indigo-900' : 'text-gray-700 hover:bg-gray-100',
          )}
          onClick={() => onSelectFolder(null)}
        >
          <HardDrive className="h-4 w-4 shrink-0 text-gray-500" />
          All files
        </button>
        {isLoading && (
          <p className="px-3 py-2 text-xs text-gray-500">Loading folders…</p>
        )}
        {rootFolders.map((folder) => (
          <LazyTreeNode
            key={folder.id}
            folder={folder}
            depth={0}
            activeFolderId={activeFolderId}
            expandFolderIds={expandSet}
            dropTargetFolderId={dropTargetFolderId}
            expandedIds={mergedExpanded}
            toggleExpanded={toggleExpanded}
            onSelectFolder={onSelectFolder}
            onFolderDragOver={onFolderDragOver}
            onFolderDragLeave={onFolderDragLeave}
            onFolderDrop={onFolderDrop}
          />
        ))}
      </div>
    </div>
  );
}
