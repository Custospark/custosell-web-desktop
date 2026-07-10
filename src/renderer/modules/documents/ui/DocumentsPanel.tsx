import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useToast } from '../../../app/contexts/useToast';
import { cn } from '../../../shared/utils/cn';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  DocumentFolder,
  DocumentItem,
  DocumentMemberRole,
  DocumentUserRef,
  DocumentVisibility,
  FolderVisibility,
} from '../api/documentTypes';
import { documentKeys } from '../api/documentQueryKeys';
import { truncateDisplayName } from '../api/documentDisplayUtils';
import {
  downloadFileWithProgress,
  uploadDocumentWithProgress,
  createTransferId,
} from '../api/documentTransferUtils';
import {
  useCreateDocumentFolder,
  useCreateDocumentLink,
  useDeleteDocument,
  useDeleteDocumentFolder,
  useDocumentFolderContents,
  useDocumentFolderChildren,
  useDocumentFolderTree,
  useDocuments,
  useRecordDocumentDownload,
  useRecordDocumentView,
  useUpdateDocument,
  useUpdateDocumentFolder,
} from '../api/useDocumentQueries';
import { DocumentAccessSection } from './DocumentAccessSection';
import { DocumentFolderCard, DocumentItemCard } from './DocumentItemViews';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentProgressBar } from './DocumentProgressBar';
import { MoveItemModal } from './MoveItemModal';
import { RenameItemModal } from './RenameItemModal';
import { DocumentFolderTreeSidebar } from './DocumentFolderTreeSidebar';
import {
  ChevronRight,
  Folder,
  FolderPlus,
  Grid3X3,
  LayoutList,
  Link2,
  Search,
  Upload,
  WifiOff,
} from 'lucide-react';

interface DocumentsPanelProps {
  folderId?: number | null;
  customerId?: number;
  projectId?: number;
  title?: string;
  compact?: boolean;
  fullBleed?: boolean;
}

type ViewMode = 'list' | 'grid';

type TransferItem = {
  id: string;
  name: string;
  kind: 'upload' | 'download';
  percent: number;
};

function flattenTree(folders: DocumentFolder[]): DocumentFolder[] {
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

function memberPayload(members: DocumentUserRef[]) {
  const member_user_ids = members.map((member) => member.id);
  const member_roles = Object.fromEntries(
    members.map((member) => [member.id, (member.role ?? 'viewer') as DocumentMemberRole]),
  ) as Record<number, DocumentMemberRole>;
  return { member_user_ids, member_roles };
}

function visibilityForRoot<T extends string>(visibility: T, atRoot: boolean): T {
  if (atRoot && visibility === 'inherit') return 'all_staff' as T;
  return visibility;
}

function validateAccessSelection(
  visibility: FolderVisibility | DocumentVisibility,
  members: DocumentUserRef[],
): string | null {
  if (visibility === 'selected_staff' && members.length === 0) {
    return 'Select at least one team member for selected staff visibility.';
  }
  return null;
}

export default function DocumentsPanel({
  folderId = null,
  customerId,
  projectId,
  title = 'Documents',
  compact = false,
  fullBleed = false,
}: DocumentsPanelProps) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const [activeFolderId, setActiveFolderId] = useState<number | null>(folderId);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderVisibility, setFolderVisibility] = useState<FolderVisibility>('all_staff');
  const [folderMembers, setFolderMembers] = useState<DocumentUserRef[]>([]);
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('inherit');
  const [uploadMembers, setUploadMembers] = useState<DocumentUserRef[]>([]);
  const [uploadTags, setUploadTags] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ kind: 'folder' | 'document'; id: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ kind: 'folder' | 'document'; id: number; name: string } | null>(null);
  const [contentsPage, setContentsPage] = useState(1);
  const [accumulatedDocs, setAccumulatedDocs] = useState<DocumentItem[]>([]);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<number | 'panel' | null>(null);
  const [panelDragActive, setPanelDragActive] = useState(false);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSidebar = fullBleed && !customerId && !projectId;
  const searching = Boolean(debouncedSearch || tagFilter);
  const { data: moveTree = [] } = useDocumentFolderTree(Boolean(moveTarget));
  const needsRootFolders = !showSidebar && !customerId && !projectId && !activeFolderId && !searching;
  const { data: rootFoldersPage } = useDocumentFolderChildren(null, 1, needsRootFolders);
  const rootFolders = rootFoldersPage?.data ?? [];
  const { data: contents, isLoading: contentsLoading, isFetching: contentsFetching } = useDocumentFolderContents(
    activeFolderId ?? 0,
    contentsPage,
    Boolean(activeFolderId),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setContentsPage(1);
    setAccumulatedDocs([]);
  }, [activeFolderId]);

  useEffect(() => {
    if (!contents?.documents) return;
    setAccumulatedDocs((current) => (
      contentsPage === 1 ? contents.documents : [...current, ...contents.documents]
    ));
  }, [contents?.documents, contentsPage]);

  const listFilters = useMemo(() => ({
    q: debouncedSearch || undefined,
    tag: tagFilter || undefined,
    customer_id: customerId,
    project_id: projectId,
    folder_id: customerId || projectId ? undefined : (activeFolderId ?? undefined),
  }), [debouncedSearch, tagFilter, customerId, projectId, activeFolderId]);

  const needsDocumentList = searching || activeFolderId == null || customerId != null || projectId != null;
  const {
    data: documentPages,
    isLoading: searchLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useDocuments(listFilters, needsDocumentList);

  const createFolder = useCreateDocumentFolder();
  const updateFolder = useUpdateDocumentFolder();
  const deleteFolder = useDeleteDocumentFolder();
  const createLink = useCreateDocumentLink();
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();
  const recordDownload = useRecordDocumentDownload();
  const recordView = useRecordDocumentView();

  const flatFolders = useMemo(() => flattenTree(moveTree), [moveTree]);
  const searchResults = useMemo(
    () => documentPages?.pages.flatMap((page) => page.data) ?? [],
    [documentPages],
  );
  const subfolders = showSidebar
    ? (activeFolderId ? contents?.folders ?? [] : [])
    : (searching ? [] : (activeFolderId ? contents?.folders ?? [] : rootFolders));
  const documents = searching || customerId || projectId || activeFolderId == null
    ? searchResults
    : accumulatedDocs;
  const breadcrumbs = activeFolderId ? contents?.breadcrumbs ?? [] : [];
  const loading = (activeFolderId ? contentsLoading && contentsPage === 1 : false) || (needsDocumentList && searchLoading);
  const documentsMeta = searching || customerId || projectId || activeFolderId == null
    ? documentPages?.pages[documentPages.pages.length - 1]?.meta
    : contents?.documents_meta;
  const canLoadMoreDocuments = searching || customerId || projectId || activeFolderId == null
    ? Boolean(hasNextPage)
    : Boolean(documentsMeta && documentsMeta.current_page < documentsMeta.last_page);

  const canContribute = activeFolderId
    ? (contents?.folder ? contents.folder.can_contribute : true)
    : true;

  const invalidateDocuments = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: documentKeys.all });
  }, [qc]);

  const upsertTransfer = useCallback((id: string, patch: Partial<TransferItem> & Pick<TransferItem, 'name' | 'kind'>) => {
    setTransfers((current) => {
      const existing = current.find((item) => item.id === id);
      if (!existing) {
        return [...current, { id, name: patch.name, kind: patch.kind, percent: patch.percent ?? 0 }];
      }
      return current.map((item) => (item.id === id ? { ...item, ...patch } : item));
    });
  }, []);

  const removeTransfer = useCallback((id: string, delayMs = 1200) => {
    window.setTimeout(() => {
      setTransfers((current) => current.filter((item) => item.id !== id));
    }, delayMs);
  }, []);

  const uploadFiles = useCallback(async (files: FileList | File[] | null, options?: { closeModal?: boolean }) => {
    if (!files?.length || !online) return;
    if (!canContribute) {
      showToast('error', 'You cannot upload to this folder.');
      return;
    }

    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const transferId = createTransferId(`upload-${file.name}`);
      upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: 0 });
      try {
        await uploadDocumentWithProgress(
          {
            file,
            title: file.name,
            folder_id: activeFolderId,
            visibility: visibilityForRoot(uploadVisibility, activeFolderId == null),
            customer_id: customerId,
            project_id: projectId,
            tags: uploadTags.split(',').map((tag) => tag.trim()).filter(Boolean),
            ...memberPayload(uploadMembers),
          },
          (percent) => upsertTransfer(transferId, { name: file.name, kind: 'upload', percent }),
        );
        await invalidateDocuments();
        showToast('success', `${file.name} uploaded`);
      } catch (err) {
        showToast('error', sanitizeErrorMessage(err, `Upload failed for ${file.name}`));
      } finally {
        upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: 100 });
        removeTransfer(transferId);
      }
    }

    if (options?.closeModal) {
      setShowUpload(false);
      setUploadTags('');
      setUploadMembers([]);
    }
  }, [
    activeFolderId,
    canContribute,
    customerId,
    invalidateDocuments,
    online,
    projectId,
    removeTransfer,
    showToast,
    uploadMembers,
    uploadTags,
    uploadVisibility,
    upsertTransfer,
  ]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const accessError = validateAccessSelection(folderVisibility, folderMembers);
    if (accessError) {
      showToast('error', accessError);
      return;
    }

    const atRoot = activeFolderId == null;
    try {
      const folder = await createFolder.mutateAsync({
        name: folderName.trim(),
        visibility: visibilityForRoot(folderVisibility, atRoot),
        parent_id: activeFolderId,
        ...memberPayload(folderMembers),
      });
      setShowCreateFolder(false);
      setFolderName('');
      setFolderMembers([]);
      setFolderVisibility(activeFolderId ? 'inherit' : 'all_staff');
      setActiveFolderId(folder.id);
      await invalidateDocuments();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleCreateLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    const accessError = validateAccessSelection(uploadVisibility, uploadMembers);
    if (accessError) {
      showToast('error', accessError);
      return;
    }

    const atRoot = activeFolderId == null;
    try {
      await createLink.mutateAsync({
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        folder_id: activeFolderId,
        visibility: visibilityForRoot(uploadVisibility, atRoot),
        customer_id: customerId,
        project_id: projectId,
        tags: uploadTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        ...memberPayload(uploadMembers),
      });
      setShowLink(false);
      setLinkTitle('');
      setLinkUrl('');
      setUploadTags('');
      setUploadMembers([]);
      await invalidateDocuments();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleRenameConfirm = async (name: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.kind === 'folder') {
        const folder = [...subfolders, ...flatFolders].find((item) => item.id === renameTarget.id);
        if (!folder) return;
        await updateFolder.mutateAsync({
          id: renameTarget.id,
          name,
          visibility: folder.visibility,
        });
      } else {
        await updateDocument.mutateAsync({ id: renameTarget.id, title: name });
      }
      setRenameTarget(null);
      await invalidateDocuments();
    } catch {
      // Toast handled by mutation
    }
  };

  const openCreateFolderModal = () => {
    setFolderVisibility(activeFolderId ? 'inherit' : 'all_staff');
    setFolderMembers([]);
    setFolderName('');
    setShowCreateFolder(true);
  };

  const loadMoreDocuments = () => {
    if (searching || customerId || projectId || activeFolderId == null) {
      void fetchNextPage();
      return;
    }
    if (documentsMeta && documentsMeta.current_page < documentsMeta.last_page) {
      setContentsPage((page) => page + 1);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    const transferId = createTransferId(`download-${doc.id}`);
    const fileName = doc.file_name || doc.title || 'download';
    upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 0 });

    try {
      const result = await recordDownload.mutateAsync(doc.id);
      const url = result.file_url ?? doc.file_url ?? doc.url;
      if (!url) throw new Error('No download URL');
      try {
        await downloadFileWithProgress(url, fileName, (percent) => {
          upsertTransfer(transferId, { name: fileName, kind: 'download', percent });
        });
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showToast('error', sanitizeErrorMessage(err, 'Download failed'));
    } finally {
      upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 100 });
      removeTransfer(transferId);
    }
  };

  const handleMoveConfirm = async (targetFolderId: number | null) => {
    if (!moveTarget) return;
    if (moveTarget.kind === 'folder') {
      const folder = flatFolders.find((item) => item.id === moveTarget.id);
      if (!folder) return;
      await updateFolder.mutateAsync({
        id: moveTarget.id,
        name: folder.name,
        visibility: folder.visibility,
        parent_id: targetFolderId,
      });
    } else {
      await updateDocument.mutateAsync({ id: moveTarget.id, folder_id: targetFolderId });
    }
    setMoveTarget(null);
  };

  const handleFolderDrop = async (folderId: number, e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetFolderId(null);

    const docId = Number(e.dataTransfer.getData('text/document-id'));
    const draggedFolderId = Number(e.dataTransfer.getData('text/document-folder-id'));

    if (docId) {
      await updateDocument.mutateAsync({ id: docId, folder_id: folderId });
      return;
    }

    if (draggedFolderId && draggedFolderId !== folderId) {
      const draggedFolder = flatFolders.find((item) => item.id === draggedFolderId);
      if (!draggedFolder) return;
      await updateFolder.mutateAsync({
        id: draggedFolderId,
        name: draggedFolder.name,
        visibility: draggedFolder.visibility,
        parent_id: folderId,
      });
    }
  };

  const handlePanelDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setPanelDragActive(false);
    setDropTargetFolderId(null);

    if (e.dataTransfer.files?.length) {
      await uploadFiles(e.dataTransfer.files);
      return;
    }

    const docId = Number(e.dataTransfer.getData('text/document-id'));
    const draggedFolderId = Number(e.dataTransfer.getData('text/document-folder-id'));

    if (docId) {
      await updateDocument.mutateAsync({ id: docId, folder_id: activeFolderId });
      return;
    }

    if (draggedFolderId) {
      const draggedFolder = flatFolders.find((item) => item.id === draggedFolderId);
      if (!draggedFolder) return;
      await updateFolder.mutateAsync({
        id: draggedFolderId,
        name: draggedFolder.name,
        visibility: draggedFolder.visibility,
        parent_id: activeFolderId,
      });
    }
  };

  const contentLayoutClass = viewMode === 'grid'
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    : 'grid gap-2';

  const toolbar = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
          {!online && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
              <WifiOff className="h-3.5 w-3.5" /> Documents requires an internet connection
            </p>
          )}
          {showSidebar && activeFolderId && breadcrumbs.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-500">
              <button type="button" className="font-medium text-indigo-600 hover:underline" onClick={() => setActiveFolderId(null)}>
                All files
              </button>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  <button type="button" className="font-medium text-indigo-600 hover:underline" onClick={() => setActiveFolderId(crumb.id)}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              className={cn('rounded-md p-2', viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500')}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn('rounded-md p-2', viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500')}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={openCreateFolderModal}>
            <FolderPlus className="h-4 w-4" /> Folder
          </Button>
          <Button type="button" size="sm" disabled={!online || !canContribute} onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={!online || !canContribute} onClick={() => setShowLink(true)}>
            <Link2 className="h-4 w-4" /> Link
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, tags…"
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter by tag"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:w-auto sm:min-w-[160px]"
        />
      </div>
    </>
  );

  const fileArea = (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5',
        panelDragActive && canContribute && 'bg-indigo-50/40',
      )}
      onDragOver={(e) => {
        if (!canContribute || !online) return;
        e.preventDefault();
        setPanelDragActive(true);
        setDropTargetFolderId('panel');
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setPanelDragActive(false);
        if (dropTargetFolderId === 'panel') setDropTargetFolderId(null);
      }}
      onDrop={(e) => void handlePanelDrop(e)}
    >
      {panelDragActive && canContribute && (
        <div className="mb-3 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-center text-xs font-medium text-indigo-700">
          Drop files to upload, or drop items to move into this folder
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : (
        <div className={contentLayoutClass}>
          {!showSidebar && subfolders.map((folder) => (
            <DocumentFolderCard
              key={`folder-${folder.id}`}
              folder={folder}
              viewMode={viewMode}
              isDropTarget={dropTargetFolderId === folder.id}
              onOpen={() => setActiveFolderId(folder.id)}
              onDelete={() => {
                if (window.confirm(`Delete folder "${folder.name}" and all contents?`)) {
                  void deleteFolder.mutateAsync(folder.id);
                }
              }}
              onMove={() => setMoveTarget({ kind: 'folder', id: folder.id })}
              onRename={folder.can_manage ? () => setRenameTarget({ kind: 'folder', id: folder.id, name: folder.name }) : undefined}
              onDragStart={() => undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetFolderId(folder.id);
              }}
              onDragLeave={() => setDropTargetFolderId(null)}
              onDrop={(e) => void handleFolderDrop(folder.id, e)}
            />
          ))}

          {showSidebar && subfolders.length > 0 && (
            <div className={cn('col-span-full mb-1 flex flex-wrap gap-2', viewMode === 'grid' && 'mb-2')}>
              {subfolders.map((folder) => (
                <button
                  key={`subfolder-${folder.id}`}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span title={folder.name}>{truncateDisplayName(folder.name, 32)}</span>
                </button>
              ))}
            </div>
          )}

          {documents.map((doc) => (
            <DocumentItemCard
              key={`doc-${doc.id}`}
              doc={doc}
              viewMode={viewMode}
              onPreview={() => setPreviewDoc(doc)}
              onDownload={() => void handleDownload(doc)}
              onDelete={() => void deleteDocument.mutateAsync(doc.id)}
              onMove={() => setMoveTarget({ kind: 'document', id: doc.id })}
              onRename={(doc.can_edit || doc.can_manage)
                ? () => setRenameTarget({ kind: 'document', id: doc.id, name: doc.title })
                : undefined}
              onTagClick={setTagFilter}
              onDragStart={() => undefined}
            />
          ))}

          {subfolders.length === 0 && documents.length === 0 && (
            <div className={cn(
              'rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center',
              viewMode === 'grid' && 'col-span-full',
            )}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-700">No documents yet</p>
              <p className="mt-1 text-xs text-gray-500">
                {showSidebar && !activeFolderId
                  ? 'Browse all files, search by name, or open a folder on the left to upload.'
                  : 'Drag files here to upload, or use the Upload button.'}
              </p>
            </div>
          )}

          {canLoadMoreDocuments && (
            <div className={cn('flex justify-center pt-2', viewMode === 'grid' && 'col-span-full')}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={isFetchingNextPage || contentsFetching}
                onClick={loadMoreDocuments}
              >
                Load more
                {documentsMeta ? ` (${documents.length} of ${documentsMeta.total})` : ''}
              </Button>
            </div>
          )}
        </div>
      )}

      {transfers.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Transfers</p>
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <DocumentProgressBar
                key={transfer.id}
                label={`${transfer.kind === 'upload' ? 'Uploading' : 'Downloading'} ${transfer.name}`}
                percent={transfer.percent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const modals = (
    <>
      <DocumentPreviewModal
        document={previewDoc}
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onDownload={(doc) => void handleDownload(doc)}
        onRecordView={(doc) => { void recordView.mutateAsync(doc.id); }}
      />

      <MoveItemModal
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        title={moveTarget?.kind === 'folder' ? 'Move folder' : 'Move document'}
        tree={moveTree}
        movingFolderId={moveTarget?.kind === 'folder' ? moveTarget.id : null}
        loading={updateFolder.isPending || updateDocument.isPending}
        onConfirm={(targetFolderId) => void handleMoveConfirm(targetFolderId)}
      />

      <RenameItemModal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={renameTarget?.kind === 'folder' ? 'Rename folder' : 'Rename document'}
        initialName={renameTarget?.name ?? ''}
        loading={updateFolder.isPending || updateDocument.isPending}
        onConfirm={(name) => void handleRenameConfirm(name)}
      />

      <Modal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} title="Create folder">
        <div className="space-y-4">
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <DocumentAccessSection
            visibility={folderVisibility}
            onVisibilityChange={(value) => setFolderVisibility(value as FolderVisibility)}
            selectedMembers={folderMembers}
            onSelectedMembersChange={setFolderMembers}
            allowInherit={Boolean(activeFolderId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
            <Button type="button" loading={createFolder.isPending} onClick={() => void handleCreateFolder()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload files">
        <div className="space-y-4">
          <div
            className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void uploadFiles(e.dataTransfer.files, { closeModal: true });
            }}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Drag and drop files here, or browse</p>
            <Button type="button" className="mt-3" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void uploadFiles(e.target.files, { closeModal: true })}
            />
          </div>
          <input
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <DocumentAccessSection
            visibility={uploadVisibility}
            onVisibilityChange={(value) => setUploadVisibility(value as DocumentVisibility)}
            selectedMembers={uploadMembers}
            onSelectedMembersChange={setUploadMembers}
            allowInherit={Boolean(activeFolderId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showLink} onClose={() => setShowLink(false)} title="Add link">
        <div className="space-y-4">
          <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <DocumentAccessSection
            visibility={uploadVisibility}
            onVisibilityChange={(value) => setUploadVisibility(value as DocumentVisibility)}
            selectedMembers={uploadMembers}
            onSelectedMembersChange={setUploadMembers}
            allowInherit={Boolean(activeFolderId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowLink(false)}>Cancel</Button>
            <Button type="button" loading={createLink.isPending} onClick={() => void handleCreateLink()}>Add link</Button>
          </div>
        </div>
      </Modal>
    </>
  );

  if (showSidebar) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-gray-50 lg:flex-row">
        <aside className="flex h-auto max-h-48 w-full shrink-0 flex-col border-b border-gray-200 bg-white lg:h-full lg:max-h-none lg:w-60 lg:border-b-0 lg:border-r xl:w-72">
          <DocumentFolderTreeSidebar
            activeFolderId={activeFolderId}
            expandFolderIds={breadcrumbs.map((crumb) => crumb.id)}
            dropTargetFolderId={dropTargetFolderId}
            onSelectFolder={setActiveFolderId}
            onFolderDragOver={(folderId, e) => {
              e.preventDefault();
              setDropTargetFolderId(folderId);
            }}
            onFolderDragLeave={() => setDropTargetFolderId(null)}
            onFolderDrop={(folderId, e) => void handleFolderDrop(folderId, e)}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-gray-50/50">
          {toolbar}
          {fileArea}
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col', compact ? 'space-y-4 rounded-2xl border border-gray-200 bg-white p-4' : 'h-full min-h-0')}>
      {compact ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {!online && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <WifiOff className="h-3.5 w-3.5" /> Documents requires an internet connection
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={openCreateFolderModal}>
                <FolderPlus className="h-4 w-4" /> Folder
              </Button>
              <Button type="button" size="sm" disabled={!online || !canContribute} onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
          </div>
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents, tags…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </>
      ) : (
        toolbar
      )}
      {fileArea}
      {modals}
    </div>
  );
}
