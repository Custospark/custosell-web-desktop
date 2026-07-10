import { useCallback, useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { truncateDisplayName, documentIconLabel } from '../api/documentDisplayUtils';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import {
  useDocumentFolderChildren,
  useDocumentFolderContents,
  useDocuments,
} from '../api/useDocumentQueries';
import { DocumentFolderIcon, DocumentItemIcon } from './documentFileIcons';
import { ExplorerRowMenu, type ExplorerMenuItem } from './ExplorerRowMenu';
import { ExplorerRowOwner } from './ExplorerRowOwner';
import { DocumentTagStrip } from './DocumentTagStrip';
import { ExplorerFolderCount } from './ExplorerFolderCount';
import { DocumentExplorerActivity } from './DocumentExplorerActivity';
import { canCreateSubfolderAtDepth } from '../api/documentConstants';
import { formatDocumentHoverPath } from '../api/documentFolderPathUtils';
import { resolveFolderColor } from '../api/documentColorUtils';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { Button } from '../../../shared/components/buttons/Button';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  Download,
  FilePlus,
  FolderInput,
  FolderPlus,
  FolderUp,
  Home,
  Link2,
  Palette,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';

const INDENT = 14;

export interface DocumentExplorerActions {
  onRenameFolder?: (folder: DocumentFolder) => void;
  onDeleteFolder?: (folder: DocumentFolder) => void;
  onMoveFolder?: (folder: DocumentFolder) => void;
  onCreateSubfolder?: (folder: DocumentFolder) => void;
  onUploadToFolder?: (folderId: number | null) => void;
  onAddLinkToFolder?: (folderId: number | null) => void;
  onRenameDocument?: (doc: DocumentItem) => void;
  onDeleteDocument?: (doc: DocumentItem) => void;
  onMoveDocument?: (doc: DocumentItem) => void;
  onSetFolderColor?: (folder: DocumentFolder) => void;
  onManageFolderAccess?: (folder: DocumentFolder) => void;
  onManageDocumentAccess?: (doc: DocumentItem) => void;
  onImportFolder?: (folderId: number | null) => void;
  onExportFolder?: (folder: DocumentFolder) => void;
  onEmailFolder?: (folder: DocumentFolder) => void;
  onEmailDocument?: (doc: DocumentItem) => void;
}

interface DocumentExplorerProps {
  cabinetId: number;
  cabinetName?: string;
  activeFolderId: number | null;
  selectedDocumentId: number | null;
  openDocumentIds?: number[];
  breadcrumbs?: { id: number; name: string }[];
  expandFolderIds?: number[];
  searchQuery: string;
  tagFilter: string;
  dropTargetFolderId: number | 'panel' | 'root' | null;
  online: boolean;
  canContribute: boolean;
  actions?: DocumentExplorerActions;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onSelectFolder: (folderId: number | null) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onCreateLink: () => void;
  onImportFolder?: () => void;
  onRefresh: () => void;
  onFolderDragOver: (folderId: number | null, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number | null, e: React.DragEvent) => void;
  onDocumentDragStart: (doc: DocumentItem, e: React.DragEvent) => void;
  onFolderDragStart: (folder: DocumentFolder, e: React.DragEvent) => void;
  onCustomizeCanvas?: () => void;
}

function folderMenuItems(folder: DocumentFolder, actions: DocumentExplorerActions | undefined, online: boolean): ExplorerMenuItem[] {
  if (!actions) return [];
  const items: ExplorerMenuItem[] = [];

  if (actions.onUploadToFolder) {
    items.push({
      id: 'upload',
      label: 'Upload file here',
      icon: <Upload className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onUploadToFolder?.(folder.id),
    });
  }
  if (actions.onAddLinkToFolder) {
    items.push({
      id: 'link',
      label: 'Add link here',
      icon: <Link2 className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onAddLinkToFolder?.(folder.id),
    });
  }
  if (actions.onCreateSubfolder && canCreateSubfolderAtDepth(folder.depth)) {
    items.push({
      id: 'subfolder',
      label: 'New subfolder',
      icon: <FolderPlus className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onCreateSubfolder?.(folder),
    });
  }
  if (actions.onImportFolder) {
    items.push({
      id: 'import',
      label: 'Import folder here',
      icon: <FolderUp className="h-3.5 w-3.5" />,
      disabled: !online || !folder.can_contribute,
      onClick: () => actions.onImportFolder?.(folder.id),
    });
  }
  if (actions.onExportFolder && folder.can_view) {
    items.push({
      id: 'export',
      label: 'Download folder',
      icon: <Download className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onExportFolder?.(folder),
    });
  }
  if (actions.onEmailFolder && folder.can_view) {
    items.push({
      id: 'email',
      label: 'Email folder',
      icon: <Mail className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onEmailFolder?.(folder),
    });
  }
  if (actions.onManageFolderAccess && folder.can_manage) {
    items.push({
      id: 'access',
      label: 'Manage access',
      icon: <Shield className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onManageFolderAccess?.(folder),
    });
  }
  if (actions.onSetFolderColor && folder.can_manage) {
    items.push({
      id: 'color',
      label: 'Folder color',
      icon: <Palette className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onSetFolderColor?.(folder),
    });
  }
  if (actions.onRenameFolder && folder.can_manage) {
    items.push({
      id: 'rename',
      label: 'Rename folder',
      icon: <Pencil className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onRenameFolder?.(folder),
    });
  }
  if (actions.onMoveFolder && folder.can_manage) {
    items.push({
      id: 'move',
      label: 'Move folder',
      icon: <FolderInput className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onMoveFolder?.(folder),
    });
  }
  if (actions.onDeleteFolder && folder.can_delete) {
    items.push({
      id: 'delete',
      label: 'Delete folder',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      disabled: !online,
      danger: true,
      onClick: () => actions.onDeleteFolder?.(folder),
    });
  }

  return items;
}

function documentMenuItems(doc: DocumentItem, actions: DocumentExplorerActions | undefined, online: boolean): ExplorerMenuItem[] {
  if (!actions) return [];
  const items: ExplorerMenuItem[] = [];

  if (actions.onManageDocumentAccess && doc.can_manage) {
    items.push({
      id: 'access',
      label: 'Manage access',
      icon: <Shield className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onManageDocumentAccess?.(doc),
    });
  }
  if (actions.onRenameDocument && (doc.can_edit || doc.can_manage)) {
    items.push({
      id: 'rename',
      label: 'Rename',
      icon: <Pencil className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onRenameDocument?.(doc),
    });
  }
  if (actions.onMoveDocument && (doc.can_edit || doc.can_manage)) {
    items.push({
      id: 'move',
      label: 'Move to folder',
      icon: <FolderInput className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onMoveDocument?.(doc),
    });
  }
  if (actions.onDeleteDocument && doc.can_delete) {
    items.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      disabled: !online,
      danger: true,
      onClick: () => actions.onDeleteDocument?.(doc),
    });
  }
  if (actions.onEmailDocument && doc.can_view && doc.type !== 'link') {
    items.push({
      id: 'email',
      label: 'Email file',
      icon: <Mail className="h-3.5 w-3.5" />,
      disabled: !online,
      onClick: () => actions.onEmailDocument?.(doc),
    });
  }

  return items;
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
}: {
  doc: DocumentItem;
  depth: number;
  selected: boolean;
  isOpen: boolean;
  menuItems: ExplorerMenuItem[];
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  folderPath?: string | null;
}) {
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

function ExplorerFolderNode({
  folder,
  depth,
  folderPathPrefix = '',
  activeFolderId,
  selectedDocumentId,
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
  openDocumentIds,
  onFolderDragStart,
}: {
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
}) {
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
              <LoadingSpinner />
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

export function DocumentExplorer({
  cabinetId,
  cabinetName = 'Cabinet',
  activeFolderId,
  selectedDocumentId,
  openDocumentIds = [],
  breadcrumbs = [],
  expandFolderIds = [],
  searchQuery,
  tagFilter,
  dropTargetFolderId,
  online,
  canContribute,
  actions,
  onSearchChange,
  onTagFilterChange,
  onSelectFolder,
  onSelectDocument,
  onCreateFolder,
  onUpload,
  onCreateLink,
  onImportFolder,
  onRefresh,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onDocumentDragStart,
  onFolderDragStart,
  onCustomizeCanvas,
}: DocumentExplorerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set());
  const expandSet = useMemo(() => new Set(expandFolderIds), [expandFolderIds]);
  const openDocSet = useMemo(() => new Set(openDocumentIds), [openDocumentIds]);
  const searching = Boolean(searchQuery.trim() || tagFilter.trim());
  const atRoot = activeFolderId == null && selectedDocumentId == null;

  const { data: rootFoldersPage, isLoading: rootFoldersLoading } = useDocumentFolderChildren(
    cabinetId,
    null,
    1,
    !searching && cabinetId > 0,
  );
  const { data: rootDocsPage, isLoading: rootDocsLoading } = useDocuments(
    { root_only: true, cabinet_id: cabinetId, per_page: 100 },
    !searching && cabinetId > 0,
  );
  const { data: searchPages, isLoading: searchLoading } = useDocuments(
    {
      q: searchQuery.trim() || undefined,
      tag: tagFilter.trim() || undefined,
      cabinet_id: cabinetId,
      per_page: 50,
    },
    searching && cabinetId > 0,
  );

  const rootFolders = rootFoldersPage?.data ?? [];
  const rootDocuments = rootDocsPage?.pages[0]?.data ?? [];
  const searchResults = searchPages?.pages.flatMap((page) => page.data) ?? [];

  const isFolderExpanded = useCallback((id: number) => (
    (expandedIds.has(id) || expandSet.has(id)) && !collapsedIds.has(id)
  ), [collapsedIds, expandSet, expandedIds]);

  const toggleExpanded = (id: number) => {
    const currentlyExpanded = isFolderExpanded(id);
    if (currentlyExpanded) {
      setCollapsedIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return;
    }

    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
    setCollapsedIds((current) => {
      const next = new Set(current);
      expandSet.forEach((id) => next.add(id));
      expandedIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const loading = searching ? searchLoading : (rootFoldersLoading || rootDocsLoading);

  return (
    <div className={cn('h-full min-h-0 text-gray-900', DOCUMENT_SURFACE.explorer)}>
      <div className={cn('shrink-0 px-3 py-2.5', DOCUMENT_SURFACE.toolbar)}>
        <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            onDragOver={(e) => onFolderDragOver(null, e)}
            onDragLeave={onFolderDragLeave}
            onDrop={(e) => onFolderDrop(null, e)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition-colors',
              atRoot ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600 hover:bg-gray-100',
              dropTargetFolderId === 'root' && 'ring-1 ring-indigo-400',
            )}
          >
            <Home className="h-3.5 w-3.5" />
            {cabinetName}
          </button>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <button
                type="button"
                onClick={() => onSelectFolder(crumb.id)}
                onDragOver={(e) => onFolderDragOver(crumb.id, e)}
                onDragLeave={onFolderDragLeave}
                onDrop={(e) => onFolderDrop(crumb.id, e)}
                className={cn(
                  'max-w-[8rem] truncate rounded-md px-1.5 py-0.5 font-medium transition-colors',
                  activeFolderId === crumb.id && selectedDocumentId == null
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-indigo-600 hover:bg-gray-100',
                  dropTargetFolderId === crumb.id && 'ring-1 ring-indigo-400',
                )}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online || !canContribute}
            onClick={onUpload}
            title="Upload a file"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          {onImportFolder && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
              disabled={!online || !canContribute}
              onClick={onImportFolder}
              title="Import a folder with files"
            >
              <FolderUp className="h-3.5 w-3.5" />
              Import
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online}
            onClick={onCreateFolder}
            title="Create a new folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Folder
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 justify-center px-1.5 text-[11px] sm:px-2 sm:text-xs"
            disabled={!online || !canContribute}
            onClick={onCreateLink}
            title="Add a web link"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1">
          {onCustomizeCanvas && (
            <button
              type="button"
              title="Customize canvas"
              onClick={onCustomizeCanvas}
              className="rounded p-1 text-gray-500 hover:bg-white/70 hover:text-indigo-600"
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Refresh"
            onClick={onRefresh}
            className="rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Collapse all folders"
            onClick={collapseAll}
            className="rounded p-1 text-gray-500 hover:bg-white/70 hover:text-gray-800"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className={cn('shrink-0 space-y-1.5 px-2 py-2', DOCUMENT_SURFACE.toolbar)}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or tag…"
            className="w-full rounded-lg border border-gray-300/90 bg-white/90 py-2 pl-7 pr-2 text-xs text-gray-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-200"
          />
        </div>
        <input
          value={tagFilter}
          onChange={(e) => onTagFilterChange(e.target.value)}
          placeholder="Filter by tag (optional)"
          className="w-full rounded-lg border border-gray-300/90 bg-white/90 py-2 text-xs text-gray-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-200"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        )}

        {!loading && searching && (
          <div className="px-1">
            {searchResults.length === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">No matches</p>
                <p className="mt-1 text-xs text-gray-500">Try a different name or tag.</p>
              </div>
            )}
            {searchResults.map((doc) => (
              <ExplorerFileRow
                key={`search-${doc.id}`}
                doc={doc}
                depth={0}
                folderPath={doc.folder_path}
                selected={selectedDocumentId === doc.id}
                isOpen={openDocSet.has(doc.id)}
                menuItems={documentMenuItems(doc, actions, online)}
                onSelect={() => {
                  if (doc.folder_id != null) onSelectFolder(doc.folder_id);
                  onSelectDocument(doc);
                }}
                onDragStart={(e) => onDocumentDragStart(doc, e)}
              />
            ))}
          </div>
        )}

        {!loading && !searching && (
          <div className="px-1">
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              onDragOver={(e) => onFolderDragOver(null, e)}
              onDragLeave={onFolderDragLeave}
              onDrop={(e) => onFolderDrop(null, e)}
              className={cn(
                'mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]',
                atRoot ? 'bg-indigo-500/12 font-medium text-indigo-700' : cn('text-gray-800', DOCUMENT_SURFACE.rowHover),
                dropTargetFolderId === 'root' && 'bg-indigo-50 ring-1 ring-indigo-300 ring-inset',
              )}
            >
              <Home className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>All documents</span>
            </button>

            {rootFolders.map((folder) => (
              <ExplorerFolderNode
                key={`root-folder-${folder.id}`}
                folder={folder}
                depth={0}
                activeFolderId={activeFolderId}
                selectedDocumentId={selectedDocumentId}
                openDocumentIds={openDocSet}
                expandFolderIds={expandSet}
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

            {rootDocuments.map((doc) => (
              <ExplorerFileRow
                key={`root-doc-${doc.id}`}
                doc={doc}
                depth={0}
                selected={selectedDocumentId === doc.id}
                isOpen={openDocSet.has(doc.id)}
                menuItems={documentMenuItems(doc, actions, online)}
                onSelect={() => {
                  onSelectFolder(null);
                  onSelectDocument(doc);
                }}
                onDragStart={(e) => onDocumentDragStart(doc, e)}
              />
            ))}

            {rootFolders.length === 0 && rootDocuments.length === 0 && (
              <div className={cn('mx-2 mt-4 px-4 py-8 text-center', DOCUMENT_SURFACE.panel)}>
                <FilePlus className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-800">Your vault is empty</p>
                <p className="mt-1 text-xs text-gray-500">Upload a file, create a folder, or add a link to get started.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button type="button" size="sm" disabled={!online || !canContribute} onClick={onUpload}>
                    <Upload className="h-4 w-4" /> Upload file
                  </Button>
                  <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={onCreateFolder}>
                    <FolderPlus className="h-4 w-4" /> New folder
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DocumentExplorerActivity enabled={online} />
    </div>
  );
}
