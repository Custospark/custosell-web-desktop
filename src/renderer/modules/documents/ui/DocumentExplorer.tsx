import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import type { CabinetVisibility, DocumentFolder, DocumentItem, DocumentMemberRole } from '../api/documentTypes';
import {
  useDocumentFolderChildren,
  useDocuments,
} from '../api/useDocumentQueries';
import { DocumentExplorerActivity } from './DocumentExplorerActivity';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Button } from '../../../shared/components/buttons/Button';
import {
  FilePlus,
  FolderPlus,
  Home,
  Upload,
} from 'lucide-react';
import DocumentExplorerToolbar from './DocumentExplorerToolbar';
import { ExplorerFolderNode, ExplorerFileRow } from './ExplorerFolderNode';
import { documentMenuItems } from './explorerMenuItems';

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
  cabinetVisibility?: CabinetVisibility;
  cabinetMemberRole?: DocumentMemberRole | null;
  activeFolderId: number | null;
  selectedDocumentId: number | null;
  openDocumentIds?: number[];
  expandFolderIds?: number[];
  searchQuery: string;
  tagFilter: string;
  dropTargetFolderId: number | 'panel' | 'root' | null;
  online: boolean;
  canContribute: boolean;
  isViewerOnly?: boolean;
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

export function DocumentExplorer({
  cabinetId,
  cabinetName,
  cabinetVisibility,
  cabinetMemberRole,
  activeFolderId,
  selectedDocumentId,
  openDocumentIds = [],
  expandFolderIds = [],
  searchQuery,
  tagFilter,
  dropTargetFolderId,
  online,
  canContribute,
  isViewerOnly = false,
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
  const {
    data: cabinetDocsPages,
    isLoading: cabinetDocsLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useDocuments(
    { cabinet_id: cabinetId, per_page: 200 },
    searching && cabinetId > 0,
  );

  useEffect(() => {
    if (!searching || !hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [searching, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const rootFolders = rootFoldersPage?.data ?? [];
  const rootDocuments = rootDocsPage?.pages[0]?.data ?? [];
  const cabinetDocuments = useMemo(
    () => cabinetDocsPages?.pages.flatMap((page) => page.data) ?? [],
    [cabinetDocsPages],
  );
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tag = tagFilter.trim().toLowerCase();
    return cabinetDocuments.filter((doc) => {
      const haystack = [
        doc.title,
        doc.file_name ?? '',
        doc.folder_path ?? '',
        doc.description ?? '',
      ].join(' ').toLowerCase();
      const nameMatch = !q || haystack.includes(q);
      const tagMatch = !tag || doc.tags.some((item) => item.name.toLowerCase().includes(tag));
      return nameMatch && tagMatch;
    });
  }, [cabinetDocuments, searchQuery, tagFilter]);

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
  const loading = searching
    ? (cabinetDocsLoading || (hasNextPage && isFetchingNextPage && cabinetDocuments.length === 0))
    : (rootFoldersLoading || rootDocsLoading);

  return (
    <div className={cn('h-full min-h-0 text-gray-900', DOCUMENT_SURFACE.explorer)}>
      <DocumentExplorerToolbar
        cabinetName={cabinetName}
        cabinetVisibility={cabinetVisibility}
        cabinetMemberRole={cabinetMemberRole}
        searchQuery={searchQuery}
        tagFilter={tagFilter}
        online={online}
        canContribute={canContribute}
        isViewerOnly={isViewerOnly}
        onSearchChange={onSearchChange}
        onTagFilterChange={onTagFilterChange}
        onCreateFolder={onCreateFolder}
        onUpload={onUpload}
        onCreateLink={onCreateLink}
        onImportFolder={onImportFolder}
        onRefresh={onRefresh}
        onCustomizeCanvas={onCustomizeCanvas}
        onCollapseAll={collapseAll}
      />

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {loading && (
          <div className="flex justify-center py-6">
            <CustosellLoader />
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

      <DocumentExplorerActivity cabinetId={cabinetId} enabled={online} />
    </div>
  );
}
