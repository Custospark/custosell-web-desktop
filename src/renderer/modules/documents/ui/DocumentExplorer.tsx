import { useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { truncateDisplayName, documentIconLabel } from '../api/documentDisplayUtils';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import {
  useDocumentFolderChildren,
  useDocumentFolderContents,
  useDocuments,
} from '../api/useDocumentQueries';
import { DocumentFolderIcon, DocumentItemIcon } from './documentFileIcons';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  FilePlus,
  FolderPlus,
  Link2,
  RefreshCw,
  Search,
} from 'lucide-react';

const INDENT = 14;

interface DocumentExplorerProps {
  activeFolderId: number | null;
  selectedDocumentId: number | null;
  expandFolderIds?: number[];
  searchQuery: string;
  tagFilter: string;
  dropTargetFolderId: number | 'panel' | null;
  online: boolean;
  canContribute: boolean;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onSelectFolder: (folderId: number | null) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onCreateLink: () => void;
  onRefresh: () => void;
  onFolderDragOver: (folderId: number, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number, e: React.DragEvent) => void;
  onDocumentDragStart: (doc: DocumentItem, e: React.DragEvent) => void;
  onFolderDragStart: (folder: DocumentFolder, e: React.DragEvent) => void;
}

function ExplorerIconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-gray-600 transition-colors',
        'hover:bg-gray-200/80 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}

function ExplorerFileRow({
  doc,
  depth,
  selected,
  onSelect,
  onDragStart,
}: {
  doc: DocumentItem;
  depth: number;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const label = truncateDisplayName(documentIconLabel(doc), 40);

  return (
    <button
      type="button"
      draggable={doc.can_edit || doc.can_manage}
      onDragStart={onDragStart}
      onClick={onSelect}
      title={documentIconLabel(doc)}
      className={cn(
        'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[13px] leading-5',
        selected ? 'bg-[#0060c0]/15 text-[#0060c0]' : 'text-gray-800 hover:bg-gray-200/70',
      )}
      style={{ paddingLeft: `${8 + depth * INDENT}px` }}
    >
      <span className="inline-block h-4 w-4 shrink-0" />
      <DocumentItemIcon doc={doc} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ExplorerFolderNode({
  folder,
  depth,
  activeFolderId,
  selectedDocumentId,
  expandFolderIds,
  expandedIds,
  toggleExpanded,
  dropTargetFolderId,
  onSelectFolder,
  onSelectDocument,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onDocumentDragStart,
  onFolderDragStart,
}: {
  folder: DocumentFolder;
  depth: number;
  activeFolderId: number | null;
  selectedDocumentId: number | null;
  expandFolderIds: Set<number>;
  expandedIds: Set<number>;
  toggleExpanded: (id: number) => void;
  dropTargetFolderId: number | 'panel' | null;
  onSelectFolder: (folderId: number | null) => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onFolderDragOver: (folderId: number, e: React.DragEvent) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (folderId: number, e: React.DragEvent) => void;
  onDocumentDragStart: (doc: DocumentItem, e: React.DragEvent) => void;
  onFolderDragStart: (folder: DocumentFolder, e: React.DragEvent) => void;
}) {
  const expanded = expandedIds.has(folder.id) || expandFolderIds.has(folder.id);
  const folderSelected = activeFolderId === folder.id && selectedDocumentId == null;
  const isDropTarget = dropTargetFolderId === folder.id;

  const { data: contents, isLoading } = useDocumentFolderContents(folder.id, 1, expanded);
  const subfolders = contents?.folders ?? [];
  const documents = contents?.documents ?? [];

  const handleRowClick = () => {
    onSelectFolder(folder.id);
    if (!expanded) toggleExpanded(folder.id);
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-0.5 pr-1',
          isDropTarget && 'bg-indigo-50 ring-1 ring-indigo-300 ring-inset',
        )}
        onDragOver={(e) => onFolderDragOver(folder.id, e)}
        onDragLeave={onFolderDragLeave}
        onDrop={(e) => onFolderDrop(folder.id, e)}
      >
        <button
          type="button"
          className="flex h-6 w-5 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(folder.id);
          }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
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
            'flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left text-[13px] leading-5',
            folderSelected ? 'bg-[#0060c0]/15 text-[#0060c0]' : 'text-gray-800 hover:bg-gray-200/70',
          )}
          style={{ paddingLeft: `${4 + depth * INDENT}px` }}
        >
          <DocumentFolderIcon open={expanded && folderSelected} />
          <span className="truncate font-normal">{truncateDisplayName(folder.name, 40)}</span>
        </button>
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
              activeFolderId={activeFolderId}
              selectedDocumentId={selectedDocumentId}
              expandFolderIds={expandFolderIds}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              dropTargetFolderId={dropTargetFolderId}
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
              selected={selectedDocumentId === doc.id}
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
  activeFolderId,
  selectedDocumentId,
  expandFolderIds = [],
  searchQuery,
  tagFilter,
  dropTargetFolderId,
  online,
  canContribute,
  onSearchChange,
  onTagFilterChange,
  onSelectFolder,
  onSelectDocument,
  onCreateFolder,
  onUpload,
  onCreateLink,
  onRefresh,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  onDocumentDragStart,
  onFolderDragStart,
}: DocumentExplorerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const expandSet = useMemo(() => new Set(expandFolderIds), [expandFolderIds]);
  const searching = Boolean(searchQuery.trim() || tagFilter.trim());

  const { data: rootFoldersPage, isLoading: rootFoldersLoading } = useDocumentFolderChildren(null, 1, !searching);
  const { data: rootDocsPage, isLoading: rootDocsLoading } = useDocuments(
    { root_only: true, per_page: 100 },
    !searching,
  );
  const { data: searchPages, isLoading: searchLoading } = useDocuments(
    { q: searchQuery.trim() || undefined, tag: tagFilter.trim() || undefined, per_page: 50 },
    searching,
  );

  const rootFolders = rootFoldersPage?.data ?? [];
  const rootDocuments = rootDocsPage?.pages[0]?.data ?? [];
  const searchResults = searchPages?.pages.flatMap((page) => page.data) ?? [];

  const mergedExpanded = useMemo(() => {
    const merged = new Set(expandedIds);
    expandSet.forEach((id) => merged.add(id));
    return merged;
  }, [expandSet, expandedIds]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAll = () => setExpandedIds(new Set());

  const loading = searching ? searchLoading : (rootFoldersLoading || rootDocsLoading);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f3f3f3] text-gray-900">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-300/80 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">Explorer</span>
        <div className="flex items-center gap-0.5">
          <ExplorerIconButton title="New file (upload)" disabled={!online || !canContribute} onClick={onUpload}>
            <FilePlus className="h-4 w-4" />
          </ExplorerIconButton>
          <ExplorerIconButton title="New folder" disabled={!online} onClick={onCreateFolder}>
            <FolderPlus className="h-4 w-4" />
          </ExplorerIconButton>
          <ExplorerIconButton title="New link" disabled={!online || !canContribute} onClick={onCreateLink}>
            <Link2 className="h-4 w-4" />
          </ExplorerIconButton>
          <ExplorerIconButton title="Refresh" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </ExplorerIconButton>
          <ExplorerIconButton title="Collapse all" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4" />
          </ExplorerIconButton>
        </div>
      </div>

      <div className="shrink-0 space-y-1.5 border-b border-gray-300/80 px-2 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded border border-gray-300 bg-white py-1.5 pl-7 pr-2 text-xs outline-none focus:border-[#0060c0] focus:ring-1 focus:ring-[#0060c0]/30"
          />
        </div>
        <input
          value={tagFilter}
          onChange={(e) => onTagFilterChange(e.target.value)}
          placeholder="Filter by tag"
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0060c0] focus:ring-1 focus:ring-[#0060c0]/30"
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
              <p className="px-3 py-4 text-xs text-gray-500">No matching files</p>
            )}
            {searchResults.map((doc) => (
              <ExplorerFileRow
                key={`search-${doc.id}`}
                doc={doc}
                depth={0}
                selected={selectedDocumentId === doc.id}
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
            {rootFolders.map((folder) => (
              <ExplorerFolderNode
                key={`root-folder-${folder.id}`}
                folder={folder}
                depth={0}
                activeFolderId={activeFolderId}
                selectedDocumentId={selectedDocumentId}
                expandFolderIds={expandSet}
                expandedIds={mergedExpanded}
                toggleExpanded={toggleExpanded}
                dropTargetFolderId={dropTargetFolderId}
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
                onSelect={() => {
                  onSelectFolder(null);
                  onSelectDocument(doc);
                }}
                onDragStart={(e) => onDocumentDragStart(doc, e)}
              />
            ))}

            {rootFolders.length === 0 && rootDocuments.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-500">
                No files yet. Use the upload or folder icons above to get started.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
