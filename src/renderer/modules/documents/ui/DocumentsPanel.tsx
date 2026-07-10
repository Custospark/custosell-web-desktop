import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useToast } from '../../../app/contexts/useToast';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
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
  downloadFolderExportWithProgress,
  uploadDocumentWithProgress,
  createTransferId,
  formatDocumentBytes,
} from '../api/documentTransferUtils';
import {
  DOCUMENT_MEDIA_MAX_BYTES,
  isMediaFile,
} from '../api/documentFileViewUtils';
import {
  canMoveFolderInto,
  flattenDocumentFolders,
} from '../api/documentFolderPathUtils';
import { importFolderTree } from '../api/documentFolderImport';
import { canCreateSubfolderAtDepth, DOCUMENTS_MAX_FOLDER_DEPTH } from '../api/documentConstants';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { DOCUMENTS } from '../api/documentEndpoints';
import {
  useCreateDocumentFolder,
  useCreateDocumentLink,
  useDeleteDocument,
  useDeleteDocumentFolder,
  useDocumentFolderContents,
  useDocumentFolderChildren,
  useDocumentFolderTree,
  useDocument,
  useDocuments,
  useRecordDocumentDownload,
  useRecordDocumentView,
  useUpdateDocument,
  useUpdateDocumentFolder,
  useDocumentsVaultAppearance,
  useUpdateDocumentsVaultAppearance,
} from '../api/useDocumentQueries';
import { useDocumentCabinets } from '../api/useDocumentCabinetQueries';
import { DocumentAccessSection } from './DocumentAccessSection';
import { DocumentFolderCard, DocumentItemCard } from './DocumentItemViews';
import { DocumentDetailPane } from './DocumentDetailPane';
import { DocumentOpenTabs } from './DocumentOpenTabs';
import { DocumentExplorer, type DocumentExplorerActions } from './DocumentExplorer';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentProgressBar } from './DocumentProgressBar';
import { MoveItemModal } from './MoveItemModal';
import { RenameItemModal } from './RenameItemModal';
import { DocumentsVaultAppearanceModal } from './DocumentsVaultAppearanceModal';
import { DocumentFolderColorModal } from './DocumentFolderColorModal';
import { DocumentAccessModal } from './DocumentAccessModal';
import SendVaultEmailModal from '../../../shared/components/email/SendVaultEmailModal';
import { surfaceAppearanceStyle, DEFAULT_VAULT_APPEARANCE } from '../../../shared/utils/surfaceStyles';
import { isBusinessOwner } from '../../../shared/utils/moduleAccess';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store/store';
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
  cabinetId?: number;
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
  cabinetId,
  folderId = null,
  customerId,
  projectId,
  title = 'Documents',
  compact = false,
  fullBleed = false,
}: DocumentsPanelProps) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
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
  const [openTabs, setOpenTabs] = useState<DocumentItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    kind: 'vault_file' | 'vault_folder';
    id: number;
    label: string;
    emailSentCount?: number;
  } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ kind: 'folder' | 'document'; id: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ kind: 'folder' | 'document'; id: number; name: string } | null>(null);
  const [contentsPage, setContentsPage] = useState(1);
  const [accumulatedDocs, setAccumulatedDocs] = useState<DocumentItem[]>([]);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<number | 'panel' | 'root' | null>(null);
  const [panelDragActive, setPanelDragActive] = useState(false);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [createFolderParentId, setCreateFolderParentId] = useState<number | null>(null);
  const [actionTargetFolderId, setActionTargetFolderId] = useState<number | null>(null);
  const [showVaultAppearance, setShowVaultAppearance] = useState(false);
  const [folderColorTarget, setFolderColorTarget] = useState<DocumentFolder | null>(null);
  const [accessTarget, setAccessTarget] = useState<{
    kind: 'folder' | 'document';
    id: number;
    name: string;
    visibility: DocumentVisibility | FolderVisibility;
    members: DocumentUserRef[];
    allowInherit: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderImportInputRef = useRef<HTMLInputElement>(null);
  const [importTargetFolderId, setImportTargetFolderId] = useState<number | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const canCustomizeVault = isBusinessOwner(user);

  const showSidebar = fullBleed && !customerId && !projectId;
  const { data: fallbackCabinets } = useDocumentCabinets(undefined, !cabinetId);
  const effectiveCabinetId = cabinetId ?? fallbackCabinets?.data[0]?.id ?? 0;
  const searching = Boolean(debouncedSearch || tagFilter);
  const { data: moveTree = [] } = useDocumentFolderTree(
    effectiveCabinetId > 0 ? effectiveCabinetId : undefined,
    showSidebar || Boolean(moveTarget),
  );
  const needsRootFolders = !showSidebar && !customerId && !projectId && !activeFolderId && !searching && effectiveCabinetId > 0;
  const { data: rootFoldersPage } = useDocumentFolderChildren(effectiveCabinetId, null, 1, needsRootFolders);
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
    if (showSidebar) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset paginated folder list on folder change (card view)
    setContentsPage(1);
    setAccumulatedDocs([]);
  }, [activeFolderId, showSidebar]);

  useEffect(() => {
    if (showSidebar || !contents?.documents) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- merge paginated folder file pages in card view
    setAccumulatedDocs((current) => (
      contentsPage === 1 ? contents.documents : [...current, ...contents.documents]
    ));
  }, [contents?.documents, contentsPage, showSidebar]);

  const listFilters = useMemo(() => ({
    q: debouncedSearch || undefined,
    tag: tagFilter || undefined,
    customer_id: customerId,
    project_id: projectId,
    cabinet_id: customerId || projectId ? undefined : (effectiveCabinetId > 0 ? effectiveCabinetId : undefined),
    folder_id: customerId || projectId ? undefined : (activeFolderId ?? undefined),
  }), [debouncedSearch, tagFilter, customerId, projectId, activeFolderId, effectiveCabinetId]);

  const needsDocumentList = !showSidebar && (searching || activeFolderId == null || customerId != null || projectId != null);
  const {
    data: documentPages,
    isLoading: searchLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useDocuments(listFilters, needsDocumentList);

  const { data: freshActiveDoc } = useDocument(activeTabId ?? 0, Boolean(activeTabId && showSidebar));
  const activeTab = openTabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeDocument = showSidebar ? (activeTabId ? (freshActiveDoc ?? activeTab) : null) : previewDoc;
  const openDocumentIds = useMemo(() => openTabs.map((tab) => tab.id), [openTabs]);

  const openDocumentTab = useCallback((doc: DocumentItem) => {
    setOpenTabs((tabs) => (tabs.some((tab) => tab.id === doc.id) ? tabs : [...tabs, doc]));
    setActiveTabId(doc.id);
    if (doc.folder_id != null) setActiveFolderId(doc.folder_id);
  }, []);

  const closeDocumentTab = useCallback((id: number) => {
    setOpenTabs((tabs) => {
      const index = tabs.findIndex((tab) => tab.id === id);
      const next = tabs.filter((tab) => tab.id !== id);
      if (activeTabId === id) {
        const replacement = next[index] ?? next[index - 1] ?? null;
        setActiveTabId(replacement?.id ?? null);
        if (replacement?.folder_id != null) setActiveFolderId(replacement.folder_id);
      }
      return next;
    });
  }, [activeTabId]);

  const selectDocumentTab = useCallback((id: number) => {
    setActiveTabId(id);
    const tab = openTabs.find((item) => item.id === id);
    if (tab?.folder_id != null) setActiveFolderId(tab.folder_id);
  }, [openTabs]);
  const createFolder = useCreateDocumentFolder();
  const updateFolder = useUpdateDocumentFolder();
  const deleteFolder = useDeleteDocumentFolder();
  const createLink = useCreateDocumentLink();
  const deleteDocument = useDeleteDocument();
  const updateDocument = useUpdateDocument();
  const recordDownload = useRecordDocumentDownload();
  const recordView = useRecordDocumentView();
  const { data: vaultAppearance } = useDocumentsVaultAppearance(showSidebar);
  const updateVaultAppearance = useUpdateDocumentsVaultAppearance();

  const flatFolders = useMemo(() => flattenDocumentFolders(moveTree), [moveTree]);
  const searchResults = useMemo(
    () => documentPages?.pages.flatMap((page) => page.data) ?? [],
    [documentPages],
  );
  const subfolders = showSidebar
    ? (activeFolderId ? contents?.folders ?? [] : [])
    : (searching ? [] : (activeFolderId ? contents?.folders ?? [] : rootFolders));
  const allKnownFolders = useMemo(() => {
    const byId = new Map<number, DocumentFolder>();
    const add = (folder: DocumentFolder) => {
      if (!byId.has(folder.id)) byId.set(folder.id, folder);
    };
    flatFolders.forEach(add);
    rootFolders.forEach(add);
    subfolders.forEach(add);
    if (contents?.folder) add(contents.folder);
    return [...byId.values()];
  }, [flatFolders, rootFolders, subfolders, contents]);
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

    const targetFolderId = actionTargetFolderId ?? activeFolderId;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (isMediaFile(file) && file.size > DOCUMENT_MEDIA_MAX_BYTES) {
        showToast(
          'error',
          `${file.name} exceeds the 10 MB limit for audio/video (${formatDocumentBytes(file.size)}).`,
        );
        continue;
      }
      const transferId = createTransferId(`upload-${file.name}`);
      upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: 0 });
      try {
        await uploadDocumentWithProgress(
          {
            file,
            title: file.name,
            folder_id: targetFolderId,
            cabinet_id: targetFolderId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined,
            visibility: visibilityForRoot(uploadVisibility, targetFolderId == null),
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
      setActionTargetFolderId(null);
    }
  }, [
    actionTargetFolderId,
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
    effectiveCabinetId,
  ]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const accessError = validateAccessSelection(folderVisibility, folderMembers);
    if (accessError) {
      showToast('error', accessError);
      return;
    }

    const parentId = createFolderParentId ?? activeFolderId;
    const parentFolder = parentId
      ? [...subfolders, ...flatFolders, ...(contents?.folder ? [contents.folder] : [])].find((item) => item.id === parentId)
      : null;
    const parentDepth = parentFolder?.depth ?? 0;
    if (!canCreateSubfolderAtDepth(parentDepth)) {
      showToast('error', `Folders can only be nested up to ${DOCUMENTS_MAX_FOLDER_DEPTH} levels.`);
      return;
    }

    try {
      const folder = await createFolder.mutateAsync({
        name: folderName.trim(),
        visibility: visibilityForRoot(folderVisibility, parentId == null),
        parent_id: parentId,
        cabinet_id: parentId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined,
        ...memberPayload(folderMembers),
      });
      setShowCreateFolder(false);
      setFolderName('');
      setFolderMembers([]);
      setCreateFolderParentId(null);
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

    const targetFolderId = actionTargetFolderId ?? activeFolderId;
    try {
      await createLink.mutateAsync({
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        folder_id: targetFolderId,
        cabinet_id: targetFolderId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined,
        visibility: visibilityForRoot(uploadVisibility, targetFolderId == null),
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
      setActionTargetFolderId(null);
      await invalidateDocuments();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleRenameConfirm = async (name: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.kind === 'folder') {
        await updateFolder.mutateAsync({ id: renameTarget.id, name });
      } else {
        await updateDocument.mutateAsync({ id: renameTarget.id, title: name });
        setOpenTabs((tabs) => tabs.map((tab) => (
          tab.id === renameTarget.id ? { ...tab, title: name } : tab
        )));
      }
      setRenameTarget(null);
      await invalidateDocuments();
    } catch {
      // Toast handled by mutation
    }
  };

  const openCreateFolderModal = useCallback((parentId: number | null = activeFolderId) => {
    setCreateFolderParentId(parentId);
    setFolderVisibility(parentId ? 'inherit' : 'all_staff');
    setFolderMembers([]);
    setFolderName('');
    setShowCreateFolder(true);
  }, [activeFolderId]);

  const openUploadModal = useCallback((folderId: number | null = activeFolderId) => {
    setActionTargetFolderId(folderId);
    setShowUpload(true);
  }, [activeFolderId]);

  const openLinkModal = useCallback((folderId: number | null = activeFolderId) => {
    setActionTargetFolderId(folderId);
    setShowLink(true);
  }, [activeFolderId]);

  const handleDeleteFolder = useCallback(async (folder: DocumentFolder) => {
    const accepted = await confirm({
      title: `Delete "${folder.name}"?`,
      message: 'This permanently removes the folder and everything inside it.',
      confirmText: 'Delete folder',
      variant: 'danger',
    });
    if (!accepted) return;
    await deleteFolder.mutateAsync(folder.id);
    if (activeFolderId === folder.id) {
      setActiveFolderId(folder.parent_id);
      setActiveTabId(null);
    }
    await invalidateDocuments();
  }, [activeFolderId, confirm, deleteFolder, invalidateDocuments]);

  const handleDeleteDocument = useCallback(async (doc: DocumentItem) => {
    const accepted = await confirm({
      title: `Delete "${doc.title}"?`,
      message: 'This file will be permanently removed from your vault.',
      confirmText: 'Delete file',
      variant: 'danger',
    });
    if (!accepted) return;
    await deleteDocument.mutateAsync(doc.id);
    setOpenTabs((tabs) => tabs.filter((tab) => tab.id !== doc.id));
    if (activeTabId === doc.id) {
      const remaining = openTabs.filter((tab) => tab.id !== doc.id);
      const replacement = remaining[0] ?? null;
      setActiveTabId(replacement?.id ?? null);
      if (replacement?.folder_id != null) setActiveFolderId(replacement.folder_id);
    }
    await invalidateDocuments();
  }, [activeTabId, confirm, deleteDocument, invalidateDocuments, openTabs]);

  const triggerImportFolder = useCallback((folderId: number | null = activeFolderId) => {
    if (!online || !canContribute) {
      showToast('error', 'You cannot import into this folder.');
      return;
    }
    setImportTargetFolderId(folderId);
    folderImportInputRef.current?.click();
  }, [activeFolderId, canContribute, online, showToast]);

  const handleImportFolderFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length || !online) return;

    const targetFolderId = importTargetFolderId ?? activeFolderId;
    const parentFolder = targetFolderId
      ? [...subfolders, ...flatFolders, ...(contents?.folder ? [contents.folder] : [])].find((item) => item.id === targetFolderId)
      : null;
    const parentDepth = parentFolder?.depth ?? 0;

    const fileCount = files.length;
    const accepted = await confirm({
      title: `Import ${fileCount} file${fileCount === 1 ? '' : 's'}?`,
      message: 'The folder structure from your computer will be recreated in the vault.',
      confirmText: 'Import folder',
      variant: 'warning',
    });
    if (!accepted) return;

    const transferId = createTransferId('folder-import');
    upsertTransfer(transferId, { name: 'Folder import', kind: 'upload', percent: 0 });

    try {
      const visibility = visibilityForRoot(folderVisibility, targetFolderId == null) as FolderVisibility;
      const result = await importFolderTree({
        files,
        parentFolderId: targetFolderId,
        parentDepth,
        visibility,
        createFolder: async (payload) => {
          const { data } = await axiosInstance.post(DOCUMENTS.FOLDERS, {
            ...payload,
            cabinet_id: payload.parent_id == null && effectiveCabinetId > 0 ? effectiveCabinetId : payload.cabinet_id,
          });
          const created = (data && typeof data === 'object' && 'data' in data)
            ? (data as { data: DocumentFolder }).data
            : data as DocumentFolder;
          return created;
        },
        uploadFile: async (file, folderId) => {
          if (isMediaFile(file) && file.size > DOCUMENT_MEDIA_MAX_BYTES) {
            throw new Error(`${file.name} exceeds the 10 MB audio/video limit.`);
          }
          await uploadDocumentWithProgress({
            file,
            title: file.name,
            folder_id: folderId,
            cabinet_id: folderId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined,
            visibility: visibilityForRoot(uploadVisibility, folderId == null),
            customer_id: customerId,
            project_id: projectId,
            tags: uploadTags.split(',').map((tag) => tag.trim()).filter(Boolean),
            ...memberPayload(uploadMembers),
          });
        },
        onProgress: (_label, done, total) => {
          upsertTransfer(transferId, {
            name: 'Folder import',
            kind: 'upload',
            percent: Math.min(99, Math.round((done / Math.max(total, 1)) * 100)),
          });
        },
      });

      await invalidateDocuments();
      const skipped = result.skippedFiles + result.skippedFolders;
      if (skipped > 0) {
        showToast(
          'warning',
          `Imported ${result.filesUploaded} files and ${result.foldersCreated} folders. ${skipped} item(s) skipped (depth limit).`,
        );
      } else {
        showToast('success', `Imported ${result.filesUploaded} files in ${result.foldersCreated} folders.`);
      }
    } catch (err) {
      showToast('error', sanitizeErrorMessage(err, 'Folder import failed'));
    } finally {
      upsertTransfer(transferId, { name: 'Folder import', kind: 'upload', percent: 100 });
      removeTransfer(transferId);
      setImportTargetFolderId(null);
      if (folderImportInputRef.current) folderImportInputRef.current.value = '';
    }
  }, [
    activeFolderId,
    confirm,
    contents?.folder,
    customerId,
    flatFolders,
    folderVisibility,
    importTargetFolderId,
    invalidateDocuments,
    online,
    projectId,
    removeTransfer,
    showToast,
    subfolders,
    uploadMembers,
    uploadTags,
    uploadVisibility,
    upsertTransfer,
    effectiveCabinetId,
  ]);

  const handleExportFolder = useCallback(async (folder: DocumentFolder) => {
    if (!online) return;
    const transferId = createTransferId(`export-${folder.id}`);
    const fileName = `${folder.name}.zip`;
    upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 0 });

    try {
      await downloadFolderExportWithProgress(folder.id, fileName, (percent) => {
        upsertTransfer(transferId, { name: fileName, kind: 'download', percent });
      });
      showToast('success', `${folder.name} downloaded`);
    } catch (err) {
      showToast('error', sanitizeErrorMessage(err, 'Folder download failed'));
    } finally {
      upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 100 });
      removeTransfer(transferId);
    }
  }, [online, removeTransfer, showToast, upsertTransfer]);

  const explorerActions = useMemo<DocumentExplorerActions>(() => ({
    onRenameFolder: (folder) => setRenameTarget({ kind: 'folder', id: folder.id, name: folder.name }),
    onDeleteFolder: (folder) => { void handleDeleteFolder(folder); },
    onMoveFolder: (folder) => setMoveTarget({ kind: 'folder', id: folder.id }),
    onCreateSubfolder: (folder) => openCreateFolderModal(folder.id),
    onUploadToFolder: (folderId) => openUploadModal(folderId),
    onAddLinkToFolder: (folderId) => openLinkModal(folderId),
    onRenameDocument: (doc) => setRenameTarget({ kind: 'document', id: doc.id, name: doc.title }),
    onDeleteDocument: (doc) => { void handleDeleteDocument(doc); },
    onMoveDocument: (doc) => setMoveTarget({ kind: 'document', id: doc.id }),
    onSetFolderColor: (folder) => setFolderColorTarget(folder),
    onManageFolderAccess: (folder) => setAccessTarget({
      kind: 'folder',
      id: folder.id,
      name: folder.name,
      visibility: folder.visibility,
      members: folder.members ?? [],
      allowInherit: folder.parent_id != null,
    }),
    onManageDocumentAccess: (doc) => setAccessTarget({
      kind: 'document',
      id: doc.id,
      name: doc.title,
      visibility: doc.visibility,
      members: doc.members ?? [],
      allowInherit: doc.folder_id != null,
    }),
    onImportFolder: (folderId) => triggerImportFolder(folderId),
    onExportFolder: (folder) => { void handleExportFolder(folder); },
    onEmailFolder: (folder) => setEmailTarget({
      kind: 'vault_folder',
      id: folder.id,
      label: folder.name,
    }),
    onEmailDocument: (doc) => setEmailTarget({
      kind: 'vault_file',
      id: doc.id,
      label: doc.title,
      emailSentCount: doc.email_sent_count,
    }),
  }), [handleDeleteDocument, handleDeleteFolder, handleExportFolder, openCreateFolderModal, openLinkModal, openUploadModal, triggerImportFolder]);

  const loadMoreDocuments = () => {
    if (searching || customerId || projectId || activeFolderId == null) {
      void fetchNextPage();
      return;
    }
    if (documentsMeta && documentsMeta.current_page < documentsMeta.last_page) {
      setContentsPage((page) => page + 1);
    }
  };

  const handleRecordView = useCallback((doc: DocumentItem) => {
    recordView.mutate(doc.id);
  }, [recordView]);

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

  const handleExplorerDrop = async (targetFolderId: number | null, e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetFolderId(null);
    setPanelDragActive(false);

    const docId = Number(e.dataTransfer.getData('text/document-id'));
    const draggedFolderId = Number(e.dataTransfer.getData('text/document-folder-id'));

    try {
      if (docId) {
        await updateDocument.mutateAsync({ id: docId, folder_id: targetFolderId });
        showToast('success', 'File moved');
        return;
      }

      if (draggedFolderId) {
        if (!canMoveFolderInto(draggedFolderId, targetFolderId, allKnownFolders)) {
          showToast('error', 'Cannot move a folder into itself or its subfolders.');
          return;
        }

        const draggedFolder = allKnownFolders.find((item) => item.id === draggedFolderId);
        if (draggedFolder) {
          await updateFolder.mutateAsync({
            id: draggedFolderId,
            name: draggedFolder.name,
            visibility: draggedFolder.visibility,
            parent_id: targetFolderId,
          });
        } else {
          await updateFolder.mutateAsync({
            id: draggedFolderId,
            parent_id: targetFolderId,
          });
        }
        showToast('success', 'Folder moved');
      }
    } catch (err) {
      showToast('error', sanitizeErrorMessage(err, 'Move failed'));
    }
  };

  const handleFolderDrop = async (folderId: number, e: React.DragEvent) => {
    await handleExplorerDrop(folderId, e);
  };

  const handlePanelDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setPanelDragActive(false);
    setDropTargetFolderId(null);

    if (e.dataTransfer.files?.length) {
      await uploadFiles(e.dataTransfer.files);
      return;
    }

    await handleExplorerDrop(activeFolderId, e);
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
          <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => openCreateFolderModal(activeFolderId)}>
            <FolderPlus className="h-4 w-4" /> Folder
          </Button>
          <Button type="button" size="sm" disabled={!online || !canContribute} onClick={() => openUploadModal(activeFolderId)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={!online || !canContribute} onClick={() => openLinkModal(activeFolderId)}>
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
        <div className="ml-2 w-full sm:w-auto sm:min-w-[160px]">
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="Filter by tag"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
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
              onDelete={() => { void handleDeleteFolder(folder); }}
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
              onDelete={() => { void handleDeleteDocument(doc); }}
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
      {!showSidebar && (
        <DocumentPreviewModal
          document={previewDoc}
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          onDownload={(doc) => void handleDownload(doc)}
          onRecordView={(doc) => { void recordView.mutateAsync(doc.id); }}
        />
      )}

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

      <input
        ref={folderImportInputRef}
        type="file"
        className="hidden"
        // @ts-expect-error webkitdirectory is supported in Chromium/Electron
        webkitdirectory=""
        multiple
        onChange={(e) => void handleImportFolderFiles(e.target.files)}
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
            allowInherit={Boolean(createFolderParentId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => {
              setShowCreateFolder(false);
              setCreateFolderParentId(null);
            }}>Cancel</Button>
            <Button type="button" loading={createFolder.isPending} onClick={() => void handleCreateFolder()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showUpload} onClose={() => {
        setShowUpload(false);
        setActionTargetFolderId(null);
      }} title="Upload files">
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
            allowInherit={Boolean(actionTargetFolderId ?? activeFolderId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => {
              setShowUpload(false);
              setActionTargetFolderId(null);
            }}>Close</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showLink} onClose={() => {
        setShowLink(false);
        setActionTargetFolderId(null);
      }} title="Add link">
        <div className="space-y-4">
          <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <DocumentAccessSection
            visibility={uploadVisibility}
            onVisibilityChange={(value) => setUploadVisibility(value as DocumentVisibility)}
            selectedMembers={uploadMembers}
            onSelectedMembersChange={setUploadMembers}
            allowInherit={Boolean(actionTargetFolderId ?? activeFolderId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => {
              setShowLink(false);
              setActionTargetFolderId(null);
            }}>Cancel</Button>
            <Button type="button" loading={createLink.isPending} onClick={() => void handleCreateLink()}>Add link</Button>
          </div>
        </div>
      </Modal>

      <DocumentsVaultAppearanceModal
        open={showVaultAppearance}
        appearance={vaultAppearance ?? {}}
        saving={updateVaultAppearance.isPending}
        onClose={() => setShowVaultAppearance(false)}
        onSave={(appearance) => {
          void updateVaultAppearance.mutateAsync(appearance).then(() => setShowVaultAppearance(false));
        }}
      />

      <DocumentFolderColorModal
        folder={folderColorTarget}
        saving={updateFolder.isPending}
        onClose={() => setFolderColorTarget(null)}
        onSave={(color) => {
          if (!folderColorTarget) return;
          void updateFolder.mutateAsync({ id: folderColorTarget.id, cover_color: color })
            .then(() => setFolderColorTarget(null));
        }}
      />

      <DocumentAccessModal
        open={Boolean(accessTarget)}
        title={accessTarget?.kind === 'folder' ? 'Folder access' : 'File access'}
        itemLabel={accessTarget?.name ?? ''}
        visibility={accessTarget?.visibility ?? 'all_staff'}
        members={accessTarget?.members ?? []}
        allowInherit={accessTarget?.allowInherit ?? false}
        loading={updateFolder.isPending || updateDocument.isPending}
        onClose={() => setAccessTarget(null)}
        onSave={(payload) => {
          if (!accessTarget) return;
          const accessError = validateAccessSelection(payload.visibility, payload.members);
          if (accessError) {
            showToast('error', accessError);
            return;
          }
          if (accessTarget.kind === 'folder') {
            void updateFolder.mutateAsync({
              id: accessTarget.id,
              visibility: payload.visibility as FolderVisibility,
              member_user_ids: payload.member_user_ids,
              member_roles: payload.member_roles,
            }).then(() => {
              setAccessTarget(null);
              void invalidateDocuments();
            });
            return;
          }
          void updateDocument.mutateAsync({
            id: accessTarget.id,
            visibility: payload.visibility as DocumentVisibility,
            member_user_ids: payload.member_user_ids,
            member_roles: payload.member_roles,
          }).then(() => {
            setAccessTarget(null);
            void invalidateDocuments();
          });
        }}
      />

      {emailTarget && (
        <SendVaultEmailModal
          open
          onClose={() => setEmailTarget(null)}
          kind={emailTarget.kind}
          targetId={emailTarget.id}
          targetLabel={emailTarget.label}
          emailSentCount={emailTarget.emailSentCount}
          onSent={(result) => {
            if (emailTarget.kind === 'vault_file') {
              setOpenTabs((tabs) => tabs.map((tab) => (
                tab.id === emailTarget.id
                  ? { ...tab, email_sent_count: result.email_sent_count, last_emailed_at: result.last_emailed_at ?? null }
                  : tab
              )));
            }
            setEmailTarget(null);
            void invalidateDocuments();
          }}
        />
      )}
    </>
  );

  if (showSidebar) {
    const folderLabel = activeFolderId ? contents?.folder?.name ?? null : null;
    const activeFolder = contents?.folder ?? null;

    const resolvedAppearance = vaultAppearance?.cover_color || vaultAppearance?.background_type || vaultAppearance?.background_value
      ? vaultAppearance
      : DEFAULT_VAULT_APPEARANCE;

    return (
      <div
        className="flex h-full min-h-0 w-full flex-col lg:flex-row"
        style={surfaceAppearanceStyle(resolvedAppearance)}
      >
        <aside className="flex h-[min(50vh,28rem)] w-full shrink-0 flex-col p-1.5 sm:p-2 lg:h-full lg:max-h-none lg:min-h-0 lg:w-80 xl:w-96">
          <DocumentExplorer
            cabinetId={effectiveCabinetId}
            cabinetName={title}
            activeFolderId={activeFolderId}
            selectedDocumentId={activeTabId}
            openDocumentIds={openDocumentIds}
            breadcrumbs={breadcrumbs}
            expandFolderIds={breadcrumbs.map((crumb) => crumb.id)}
            searchQuery={search}
            tagFilter={tagFilter}
            dropTargetFolderId={dropTargetFolderId}
            online={online}
            canContribute={canContribute}
            actions={explorerActions}
            onSearchChange={setSearch}
            onTagFilterChange={setTagFilter}
            onSelectFolder={(folderId) => {
              setActiveFolderId(folderId);
              setActiveTabId(null);
            }}
            onSelectDocument={openDocumentTab}
            onCreateFolder={() => openCreateFolderModal(activeFolderId)}
            onUpload={() => openUploadModal(activeFolderId)}
            onCreateLink={() => openLinkModal(activeFolderId)}
            onImportFolder={() => triggerImportFolder(activeFolderId)}
            onRefresh={() => { void invalidateDocuments(); }}
            onFolderDragOver={(folderId, e) => {
              e.preventDefault();
              setDropTargetFolderId(folderId ?? 'root');
            }}
            onFolderDragLeave={() => setDropTargetFolderId(null)}
            onFolderDrop={(folderId, e) => void handleExplorerDrop(folderId, e)}
            onDocumentDragStart={(doc, e) => {
              e.dataTransfer.setData('text/document-id', String(doc.id));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onFolderDragStart={(folder, e) => {
              e.dataTransfer.setData('text/document-folder-id', String(folder.id));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onCustomizeCanvas={canCustomizeVault ? () => setShowVaultAppearance(true) : undefined}
          />
        </aside>

        <div
          className={cn(
            'm-1.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 shadow-sm sm:m-2',
            panelDragActive && canContribute && 'ring-2 ring-inset ring-indigo-300',
          )}
          onDragOver={(e) => {
            if (!canContribute || !online) return;
            e.preventDefault();
            setPanelDragActive(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setPanelDragActive(false);
          }}
          onDrop={(e) => void handlePanelDrop(e)}
        >
          {!online && (
            <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              <WifiOff className="h-3.5 w-3.5" /> Documents requires an internet connection
            </div>
          )}
          {panelDragActive && canContribute && (
            <div className="shrink-0 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-xs font-medium text-indigo-700">
              Drop files to upload to {folderLabel ?? 'root'}
            </div>
          )}
          <DocumentOpenTabs
            tabs={openTabs}
            activeTabId={activeTabId}
            onSelectTab={selectDocumentTab}
            onCloseTab={closeDocumentTab}
          />
          <DocumentDetailPane
            document={activeDocument}
            folder={activeFolder}
            folderName={folderLabel}
            breadcrumbs={breadcrumbs}
            loading={Boolean(activeFolderId && contentsLoading && !activeTabId)}
            online={online}
            canContribute={canContribute}
            onGoHome={() => {
              setActiveFolderId(null);
              setActiveTabId(null);
            }}
            onUpload={() => openUploadModal(activeFolderId)}
            onCreateLink={() => openLinkModal(activeFolderId)}
            onCreateFolder={() => openCreateFolderModal(null)}
            onCreateSubfolder={() => activeFolderId && openCreateFolderModal(activeFolderId)}
            onDownload={(doc) => void handleDownload(doc)}
            onRename={(doc) => setRenameTarget({ kind: 'document', id: doc.id, name: doc.title })}
            onMove={(doc) => setMoveTarget({ kind: 'document', id: doc.id })}
            onDelete={(doc) => { void handleDeleteDocument(doc); }}
            onRenameFolder={() => {
              if (!activeFolder) return;
              setRenameTarget({ kind: 'folder', id: activeFolder.id, name: activeFolder.name });
            }}
            onMoveFolder={() => {
              if (!activeFolder) return;
              setMoveTarget({ kind: 'folder', id: activeFolder.id });
            }}
            onDeleteFolder={() => {
              if (!activeFolder) return;
              void handleDeleteFolder(activeFolder);
            }}
            onExportFolder={() => {
              if (!activeFolder) return;
              void handleExportFolder(activeFolder);
            }}
            onEmailFolder={() => {
              if (!activeFolder) return;
              setEmailTarget({ kind: 'vault_folder', id: activeFolder.id, label: activeFolder.name });
            }}
            onEmailDocument={(doc) => setEmailTarget({
              kind: 'vault_file',
              id: doc.id,
              label: doc.title,
              emailSentCount: doc.email_sent_count,
            })}
            onClose={() => activeTabId && closeDocumentTab(activeTabId)}
            onManageFolderAccess={() => {
              if (!activeFolder) return;
              setAccessTarget({
                kind: 'folder',
                id: activeFolder.id,
                name: activeFolder.name,
                visibility: activeFolder.visibility,
                members: activeFolder.members ?? [],
                allowInherit: activeFolder.parent_id != null,
              });
            }}
            onManageDocumentAccess={(doc) => setAccessTarget({
              kind: 'document',
              id: doc.id,
              name: doc.title,
              visibility: doc.visibility,
              members: doc.members ?? [],
              allowInherit: doc.folder_id != null,
            })}
            onRecordView={handleRecordView}
            onSelectFolder={(folderId) => {
              setActiveFolderId(folderId);
              setActiveTabId(null);
            }}
          />
          {transfers.length > 0 && (
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
              <div className="space-y-2">
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
              <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => openCreateFolderModal(activeFolderId)}>
                <FolderPlus className="h-4 w-4" /> Folder
              </Button>
              <Button type="button" size="sm" disabled={!online || !canContribute} onClick={() => openUploadModal(activeFolderId)}>
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
