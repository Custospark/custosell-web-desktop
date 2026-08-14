import { cn } from '../../../shared/utils/cn';
import { truncateDisplayName, documentIconLabel } from '../api/documentDisplayUtils';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import { useDocumentFolderContents } from '../api/useDocumentQueries';
import { DocumentFolderIcon, DocumentItemIcon } from './documentFileIcons';
import { ExplorerRowMenu, type ExplorerMenuItem } from './ExplorerRowMenu';
import { ExplorerRowOwner } from './ExplorerRowOwner';
import { DocumentTagStrip } from './DocumentTagStrip';
import { ExplorerFolderCount } from './ExplorerFolderCount';
import { formatDocumentHoverPath } from '../api/documentFolderPathUtils';
import { resolveFolderColor } from '../api/documentColorUtils';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { DocumentExplorerActions } from './DocumentExplorer';
import { folderMenuItems, documentMenuItems } from './explorerMenuItems';

const INDENT = 14;

interface ExplorerFileRowProps {
  doc: DocumentItem;
  depth: number;
  selected: boolean;
  isOpen: boolean;
  menuItems: ExplorerMenuItem[];
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  folderPath?: string | null;
}

function ExplorerFileRow({
  doc,
  depth,
  selected,
  isOpen,
  menuItems,
  onSelect,
  onDragStart,
  folderPath,
}: ExplorerFileRowProps) {
  const label = truncateDisplayName(documentIconLabel(doc), 40);
  const hoverPath = formatDocumentHoverPath(doc, folderPath);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-0.5 pr-1',
        selected && DOCUMENT_SURFACE.rowSelected,
        !selected && isOpen && 'bg-indigo-500/8',
      )}
    >
      <button
        type="button"
        draggable={doc.can_edit || doc.can_manage}
        onDragStart={onDragStart}
        onClick={onSelect}
        title={hoverPath}
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-0.5 py-1.5 text-left text-[13px] leading-5',
          selected ? 'font-medium text-indigo-700' : cn('text-gray-800', DOCUMENT_SURFACE.rowHover),
        )}
        style={{ paddingLeft: `${8 + depth * INDENT}px` }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="inline-block h-4 w-4 shrink-0" />
          <DocumentItemIcon doc={doc} />
          <span className="min-w-0 truncate">{label}</span>
          <ExplorerRowOwner user={doc.uploader} />
        </span>
        <DocumentTagStrip tags={doc.tags} className="pl-6" />
      </button>
      <ExplorerRowMenu items={menuItems} className="mr-1" pinnedVisible={selected} />
    </div>
  );
}

interface ExplorerFolderNodeProps {
  folder: DocumentFolder;
  depth: number;
  folderPathPrefix?: string;
  activeFolderId: number | null;
  selectedDocumentId: number | null;
  openDocumentIds: Set<number>;
  expandFolderIds: Set<number>;
  expandedIds: Set<number>;
  collapsedIds: Set<number>;
  toggleExpanded: (id: number) => void;
  dropTargetFolderId: number | 'panel' | 'root' | null;
  actions?: DocumentExplorerActions;
  online: boolean;
  onSelectFolder: (folderId: number | null) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onFolderDragOver: (folderId: number | null, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number | null, e: React.DragEvent) => void;
  onDocumentDragStart: (doc: DocumentItem, e: React.DragEvent) => void;
  onFolderDragStart: (folder: DocumentFolder, e: React.DragEvent) => void;
}

export function ExplorerFolderNode({
  folder,
  depth,
  folderPathPrefix = '',
  activeFolderId,
  selectedDocumentId,
  openDocumentIds,
  expandFolderIds,
  expandedIds,
  collapsedIds,
  toggleExpanded,
  dropTargetFolderId,
  actions,
  online,
  onSelectFolder,
  onSelectDocument,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onDocumentDragStart,
  onFolderDragStart,
}: ExplorerFolderNodeProps) {
  const expanded = (expandedIds.has(folder.id) || expandFolderIds.has(folder.id)) && !collapsedIds.has(folder.id);
  const folderPath = folderPathPrefix ? `${folderPathPrefix}/${folder.name}` : folder.name;
  const folderSelected = activeFolderId === folder.id && selectedDocumentId == null;
  const isDropTarget = dropTargetFolderId === folder.id;
  const menuItems = folderMenuItems(folder, actions, online);

  const { data: contents, isLoading } = useDocumentFolderContents(folder.id, 1, expanded);
  const subfolders = contents?.folders ?? [];
  const documents = contents?.documents ?? [];

  const handleRowClick = () => {
    onSelectFolder(folder.id);
    if (!expanded) toggleExpanded(folder.id);
  };

  const folderColor = resolveFolderColor(folder);

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-center gap-0.5 pr-1',
          isDropTarget && 'bg-indigo-50 ring-1 ring-indigo-300 ring-inset',
          folderSelected && DOCUMENT_SURFACE.rowSelected,
        )}
        onDragOver={(e) => {
          if (!expanded) toggleExpanded(folder.id);
          onFolderDragOver(folder.id, e);
        }}
        onDragLeave={onFolderDragLeave}
        onDrop={(e) => onFolderDrop(folder.id, e)}
      >
        <button
          type="button"
          className="flex h-7 w-5 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(folder.id);
          }}
          aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          draggable={folder.can_manage}
          onDragStart={(e) => onFolderDragStart(folder, e)}
          onClick={handleRowClick}
          title={folder.name}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-1 text-left text-[13px] leading-5',
            folderSelected ? 'font-medium text-indigo-700' : cn('text-gray-800', DOCUMENT_SURFACE.rowHover),
          )}
          style={{ paddingLeft: `${4 + depth * INDENT}px` }}
        >
          <DocumentFolderIcon open={expanded || folderSelected} tint={folderColor} />
          <span className="min-w-0 truncate">{truncateDisplayName(folder.name, 28)}</span>
          <ExplorerRowOwner user={folder.creator} />
        </button>
        <ExplorerFolderCount folder={folder} />
        <ExplorerRowMenu items={menuItems} className="mr-1" pinnedVisible={folderSelected} />
      </div>

      {expanded && (
        <div>
          {isLoading && (
            <div className="py-2 pl-8">
              <CustosellLoader />
            </div>
          )}
          {subfolders.map((child) => (
            <ExplorerFolderNode
              key={`folder-${child.id}`}
              folder={child}
              depth={depth + 1}
              folderPathPrefix={folderPath}
              activeFolderId={activeFolderId}
              selectedDocumentId={selectedDocumentId}
              openDocumentIds={openDocumentIds}
              expandFolderIds={expandFolderIds}
              expandedIds={expandedIds}
              collapsedIds={collapsedIds}
              toggleExpanded={toggleExpanded}
              dropTargetFolderId={dropTargetFolderId}
              actions={actions}
              online={online}
              onSelectFolder={onSelectFolder}
              onSelectDocument={onSelectDocument}
              onFolderDragOver={onFolderDragOver}
              onFolderDragLeave={onFolderDragLeave}
              onFolderDrop={onFolderDrop}
              onDocumentDragStart={onDocumentDragStart}
              onFolderDragStart={onFolderDragStart}
            />
          ))}
          {documents.map((doc) => (
            <ExplorerFileRow
              key={`doc-${doc.id}`}
              doc={doc}
              depth={depth + 1}
              folderPath={folderPath}
              selected={selectedDocumentId === doc.id}
              isOpen={openDocumentIds.has(doc.id)}
              menuItems={documentMenuItems(doc, actions, online)}
              onSelect={() => {
                onSelectFolder(folder.id);
                onSelectDocument(doc);
              }}
              onDragStart={(e) => onDocumentDragStart(doc, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
