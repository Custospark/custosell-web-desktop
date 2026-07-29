import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../app/contexts/useToast';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { DocumentCabinet, DocumentFolder, DocumentItem, DocumentMemberRole, DocumentUserRef, DocumentVisibility, DocumentsVaultAppearance, FolderVisibility } from '../api/documentTypes';
import { documentKeys } from '../api/documentQueryKeys';
import { downloadFileWithProgress, downloadFolderExportWithProgress, uploadDocumentWithProgress, createTransferId, formatDocumentBytes } from '../api/documentTransferUtils';
import { DOCUMENT_MEDIA_MAX_BYTES, isMediaFile } from '../api/documentFileViewUtils';
import { canMoveFolderInto, flattenDocumentFolders } from '../api/documentFolderPathUtils';
import { importFolderTree } from '../api/documentFolderImport';
import { canCreateSubfolderAtDepth, DOCUMENTS_MAX_FOLDER_DEPTH } from '../api/documentConstants';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { DOCUMENTS } from '../api/documentEndpoints';
import { useCreateDocumentFolder, useCreateDocumentLink, useDeleteDocument, useDeleteDocumentFolder, useDocumentFolderContents, useDocumentFolderChildren, useDocumentFolderTree, useDocument, useDocuments, useRecordDocumentDownload, useRecordDocumentView, useUpdateDocument, useUpdateDocumentFolder, useDocumentsVaultAppearance, useUpdateDocumentsVaultAppearance } from '../api/useDocumentQueries';
import { useDocumentCabinets } from '../api/useDocumentCabinetQueries';
import type { DocumentExplorerActions } from './DocumentExplorer';
import { DEFAULT_VAULT_APPEARANCE } from '../../../shared/utils/surfaceStyles';
import { isBusinessOwner } from '../../../shared/utils/moduleAccess';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store/store';

type ViewMode = 'list' | 'grid';
type TransferItem = { id: string; name: string; kind: 'upload' | 'download'; percent: number };

function memberPayload(members: DocumentUserRef[]) {
  const member_user_ids = members.map((m) => m.id);
  const member_roles = Object.fromEntries(members.map((m) => [m.id, (m.role ?? 'viewer') as DocumentMemberRole])) as Record<number, DocumentMemberRole>;
  return { member_user_ids, member_roles };
}
function visibilityForRoot<T extends string>(v: T, atRoot: boolean): T { return atRoot && v === 'inherit' ? 'all_staff' as T : v; }
function validateAccessSelection(v: FolderVisibility | DocumentVisibility, members: DocumentUserRef[]): string | null {
  return v === 'selected_staff' && members.length === 0 ? 'Select at least one team member for selected staff visibility.' : null;
}

export interface DocumentsPanelData {
  activeFolderId: number | null; viewMode: ViewMode; search: string; tagFilter: string; loading: boolean;
  online: boolean; showSidebar: boolean; effectiveCabinetId: number; searching: boolean;
  contentsLoading: boolean; contentsFetching: boolean; canLoadMoreDocuments: boolean;
  canContribute: boolean; isViewerOnly: boolean; panelDragActive: boolean;
  dropTargetFolderId: number | 'panel' | 'root' | null; transfers: TransferItem[];
  activeTabId: number | null; openTabs: DocumentItem[]; activeDocument: DocumentItem | null;
  previewDoc: DocumentItem | null;
  contents: { folders: DocumentFolder[]; documents: DocumentItem[]; breadcrumbs: { id: number; name: string }[]; folder: DocumentFolder | null; documents_meta?: { current_page: number; last_page: number; total: number } } | null;
  subfolders: DocumentFolder[]; documents: DocumentItem[];
  documentsMeta: { current_page: number; last_page: number; total: number } | undefined;
  breadcrumbs: { id: number; name: string }[]; allKnownFolders: DocumentFolder[];
  flatFolders: DocumentFolder[]; moveTree: DocumentFolder[]; contentLayoutClass: string;
  user: { name?: string; business?: { subscription?: { plan_slug?: string | null } | null } | null } | null;
  canCustomizeVault: boolean; isFetchingNextPage: boolean;
  vaultAppearance: DocumentsVaultAppearance | undefined; cabinet: DocumentCabinet | null;
  title: string; compact: boolean; cabinetId?: number; customerId?: number; projectId?: number; rootFolders: DocumentFolder[];
  folderLabel: string | null; activeFolder: DocumentFolder | null;
  resolvedAppearance: DocumentsVaultAppearance;
}

export interface DocumentsPanelActions {
  setActiveFolderId: (id: number | null) => void; setViewMode: (mode: ViewMode) => void;
  setSearch: (v: string) => void; setTagFilter: (v: string) => void;
  setPanelDragActive: (v: boolean) => void; setDropTargetFolderId: (v: number | 'panel' | 'root' | null) => void;
  setPreviewDoc: (v: DocumentItem | null) => void; setShowVaultAppearance: (v: boolean) => void;
  setShowCreateFolder: (v: boolean) => void; setShowUpload: (v: boolean) => void;
  setShowLink: (v: boolean) => void; setFolderName: (v: string) => void;
  setFolderVisibility: (v: FolderVisibility) => void; setFolderMembers: (v: DocumentUserRef[]) => void;
  setUploadVisibility: (v: DocumentVisibility) => void; setUploadMembers: (v: DocumentUserRef[]) => void;
  setUploadTags: (v: string) => void; setLinkTitle: (v: string) => void;
  setLinkUrl: (v: string) => void; setCreateFolderParentId: (v: number | null) => void;
  setActionTargetFolderId: (v: number | null) => void;
  setActiveTabId: (v: number | null) => void;
  setMoveTarget: (v: { kind: 'folder' | 'document'; id: number } | null) => void;
  setRenameTarget: (v: { kind: 'folder' | 'document'; id: number; name: string } | null) => void;
  setAccessTarget: (v: { kind: 'folder' | 'document'; id: number; name: string; visibility: DocumentVisibility | FolderVisibility; members: DocumentUserRef[]; allowInherit: boolean } | null) => void;
  setEmailTarget: (v: { kind: 'vault_file' | 'vault_folder'; id: number; label: string; emailSentCount?: number } | null) => void;
  openDocumentTab: (doc: DocumentItem) => void; selectDocumentTab: (id: number) => void;
  closeDocumentTab: (id: number) => void; openCreateFolderModal: (parentId?: number | null) => void;
  openUploadModal: (fId?: number | null) => void; openLinkModal: (fId?: number | null) => void;
  triggerImportFolder: (fId?: number | null) => void;
  handleDownload: (doc: DocumentItem) => Promise<void>; handleRecordView: (doc: DocumentItem) => void;
  loadMoreDocuments: () => void; handleCreateFolder: () => Promise<void>;
  handleCreateLink: () => Promise<void>; handleRenameConfirm: (name: string) => Promise<void>;
  handleDeleteFolder: (folder: DocumentFolder) => Promise<void>;
  handleDeleteDocument: (doc: DocumentItem) => Promise<void>;
  handleMoveConfirm: (targetId: number | null) => Promise<void>;
  handleExplorerDrop: (targetId: number | null, e: React.DragEvent) => Promise<void>;
  handleFolderDrop: (fId: number, e: React.DragEvent) => Promise<void>;
  handlePanelDrop: (e: React.DragEvent) => Promise<void>;
  handleExportFolder: (folder: DocumentFolder) => Promise<void>;
  handleImportFolderFiles: (files: FileList | null) => Promise<void>;
  handleEmailTargetChange: (v: { kind: 'vault_file' | 'vault_folder'; id: number; label: string; emailSentCount?: number } | null) => void;
  handleEmailSent: (id: number, result: { email_sent_count: number; last_emailed_at?: string | null }) => void;
  handleMoveTargetChange: (v: { kind: 'folder' | 'document'; id: number } | null) => void;
  handleRenameTargetChange: (v: { kind: 'folder' | 'document'; id: number; name: string } | null) => void;
  handleAccessTargetChange: (v: { kind: 'folder' | 'document'; id: number; name: string; visibility: DocumentVisibility | FolderVisibility; members: DocumentUserRef[]; allowInherit: boolean } | null) => void;
  handleFolderColorTargetChange: (v: DocumentFolder | null) => void;
  invalidateDocuments: () => Promise<void>; uploadFiles: (files: FileList | File[] | null, opts?: { closeModal?: boolean }) => Promise<void>;
  explorerActions: DocumentExplorerActions;
}

export interface DocumentsPanelModalState {
  showCreateFolder: boolean; showUpload: boolean; showLink: boolean; showVaultAppearance: boolean;
  previewDoc: DocumentItem | null; moveTarget: { kind: 'folder' | 'document'; id: number } | null;
  renameTarget: { kind: 'folder' | 'document'; id: number; name: string } | null;
  accessTarget: { kind: 'folder' | 'document'; id: number; name: string; visibility: DocumentVisibility | FolderVisibility; members: DocumentUserRef[]; allowInherit: boolean } | null;
  folderColorTarget: DocumentFolder | null;
  emailTarget: { kind: 'vault_file' | 'vault_folder'; id: number; label: string; emailSentCount?: number } | null;
  actionTargetFolderId: number | null; folderName: string; folderVisibility: FolderVisibility;
  folderMembers: DocumentUserRef[]; uploadVisibility: DocumentVisibility; uploadMembers: DocumentUserRef[];
  uploadTags: string; linkTitle: string; linkUrl: string; createFolderParentId: number | null;
}

export function useDocumentsPanel(input: { cabinetId?: number; cabinet?: DocumentCabinet | null; folderId?: number | null; customerId?: number; projectId?: number; title?: string; compact?: boolean; fullBleed?: boolean }) {
  const { cabinetId, cabinet: cabinetProp, folderId, customerId, projectId, title = 'Documents', compact = false, fullBleed = false } = input;
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const user = useSelector((state: RootState) => state.auth.user);

  const [activeFolderId, setActiveFolderId] = useState<number | null>(folderId ?? null);
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
  const [emailTarget, setEmailTarget] = useState<{ kind: 'vault_file' | 'vault_folder'; id: number; label: string; emailSentCount?: number } | null>(null);
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
  const [accessTarget, setAccessTarget] = useState<{ kind: 'folder' | 'document'; id: number; name: string; visibility: DocumentVisibility | FolderVisibility; members: DocumentUserRef[]; allowInherit: boolean } | null>(null);
  const [importTargetFolderId, setImportTargetFolderId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderImportInputRef = useRef<HTMLInputElement>(null);

  const cabinet = cabinetProp ?? null;
  const showSidebar = fullBleed && !customerId && !projectId;
  const { data: fallbackCabinets } = useDocumentCabinets(undefined, !cabinetId);
  const effectiveCabinetId = cabinetId ?? fallbackCabinets?.data[0]?.id ?? 0;
  const searching = Boolean(debouncedSearch || tagFilter);
  const { data: moveTree = [] } = useDocumentFolderTree(effectiveCabinetId > 0 ? effectiveCabinetId : undefined, showSidebar || Boolean(moveTarget));
  const needsRootFolders = !showSidebar && !customerId && !projectId && !activeFolderId && !searching && effectiveCabinetId > 0;
  const { data: rootFoldersPage } = useDocumentFolderChildren(effectiveCabinetId, null, 1, needsRootFolders);
  const rootFolders = rootFoldersPage?.data ?? [];
  const { data: contents, isLoading: contentsLoading, isFetching: contentsFetching } = useDocumentFolderContents(activeFolderId ?? 0, contentsPage, Boolean(activeFolderId));
  const listFilters = useMemo(() => ({ q: debouncedSearch || undefined, tag: tagFilter || undefined, customer_id: customerId, project_id: projectId, cabinet_id: customerId || projectId ? undefined : (effectiveCabinetId > 0 ? effectiveCabinetId : undefined), folder_id: customerId || projectId ? undefined : (activeFolderId ?? undefined) }), [debouncedSearch, tagFilter, customerId, projectId, activeFolderId, effectiveCabinetId]);
  const needsDocumentList = !showSidebar && (searching || activeFolderId == null || customerId != null || projectId != null);
  const { data: documentPages, isLoading: searchLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useDocuments(listFilters, needsDocumentList);
  const { data: freshActiveDoc } = useDocument(activeTabId ?? 0, Boolean(activeTabId && showSidebar));

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
  const canCustomizeVault = isBusinessOwner(user);

  const activeTab = openTabs.find((tab) => tab.id === activeTabId) ?? null;
  const activeDocument = showSidebar ? (activeTabId ? (freshActiveDoc ?? activeTab) : null) : previewDoc;
  const flatFolders = useMemo(() => flattenDocumentFolders(moveTree), [moveTree]);
  const searchResults = useMemo(() => documentPages?.pages.flatMap((p) => p.data) ?? [], [documentPages]);

  useEffect(() => { const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => window.clearTimeout(t); }, [search]);
  useEffect(() => { if (showSidebar) return; setContentsPage(1); setAccumulatedDocs([]); }, [activeFolderId, showSidebar]);
  useEffect(() => { if (showSidebar || !contents?.documents) return; setAccumulatedDocs((c) => (contentsPage === 1 ? contents.documents : [...c, ...contents.documents])); }, [contents?.documents, contentsPage, showSidebar]);

  const subfolders = showSidebar ? (activeFolderId ? contents?.folders ?? [] : []) : (searching ? [] : (activeFolderId ? contents?.folders ?? [] : rootFolders));
  const allKnownFolders = useMemo(() => { const byId = new Map<number, DocumentFolder>(); const add = (f: DocumentFolder) => { if (!byId.has(f.id)) byId.set(f.id, f); }; flatFolders.forEach(add); rootFolders.forEach(add); subfolders.forEach(add); if (contents?.folder) add(contents.folder); return [...byId.values()]; }, [flatFolders, rootFolders, subfolders, contents]);
  const documents = searching || customerId || projectId || activeFolderId == null ? searchResults : accumulatedDocs;
  const breadcrumbs = activeFolderId ? contents?.breadcrumbs ?? [] : [];
  const documentsMeta = searching || customerId || projectId || activeFolderId == null ? documentPages?.pages[documentPages.pages.length - 1]?.meta : contents?.documents_meta;
  const loading = (activeFolderId ? contentsLoading && contentsPage === 1 : false) || (needsDocumentList && searchLoading);
  const canLoadMoreDocuments = searching || customerId || projectId || activeFolderId == null ? Boolean(hasNextPage) : Boolean(documentsMeta && documentsMeta.current_page < documentsMeta.last_page);
  const canContribute = activeFolderId ? (contents?.folder ? contents.folder.can_contribute : Boolean(cabinet?.can_contribute)) : Boolean(cabinet?.can_contribute ?? true);
  const isViewerOnly = Boolean(cabinet) && !canContribute && !cabinet?.can_manage;
  const contentLayoutClass = viewMode === 'grid' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid gap-2';
  const folderLabel = activeFolderId ? contents?.folder?.name ?? null : null;
  const activeFolder = contents?.folder ?? null;
  const resolvedAppearance = (cabinet?.cover_color || cabinet?.background_type || cabinet?.background_value ? { cover_color: cabinet.cover_color, background_type: cabinet.background_type ?? null, background_value: cabinet.background_value ?? null } : null)
    ?? (vaultAppearance?.cover_color || vaultAppearance?.background_type || vaultAppearance?.background_value ? vaultAppearance : DEFAULT_VAULT_APPEARANCE);

  const invalidateDocuments = useCallback(async () => { await qc.invalidateQueries({ queryKey: documentKeys.all }); }, [qc]);
  const upsertTransfer = useCallback((id: string, patch: Partial<TransferItem> & Pick<TransferItem, 'name' | 'kind'>) => { setTransfers((c) => { const e = c.find((i) => i.id === id); return e ? c.map((i) => (i.id === id ? { ...i, ...patch } : i)) : [...c, { id, name: patch.name, kind: patch.kind, percent: patch.percent ?? 0 }]; }); }, []);
  const removeTransfer = useCallback((id: string, delayMs = 1200) => { window.setTimeout(() => { setTransfers((c) => c.filter((i) => i.id !== id)); }, delayMs); }, []);

  const openDocumentTab = useCallback((doc: DocumentItem) => { setOpenTabs((t) => (t.some((i) => i.id === doc.id) ? t : [...t, doc])); setActiveTabId(doc.id); if (doc.folder_id != null) setActiveFolderId(doc.folder_id); }, []);
  const closeDocumentTab = useCallback((id: number) => { setOpenTabs((t) => { const i = t.findIndex((x) => x.id === id); const n = t.filter((x) => x.id !== id); if (activeTabId === id) { const r = n[i] ?? n[i - 1] ?? null; setActiveTabId(r?.id ?? null); if (r?.folder_id != null) setActiveFolderId(r.folder_id); } return n; }); }, [activeTabId]);
  const selectDocumentTab = useCallback((id: number) => { setActiveTabId(id); const tab = openTabs.find((x) => x.id === id); if (tab?.folder_id != null) setActiveFolderId(tab.folder_id); }, [openTabs]);

  const uploadFiles = useCallback(async (files: FileList | File[] | null, opts?: { closeModal?: boolean }) => {
    if (!files?.length || !online) return;
    if (!canContribute) { showToast('error', 'You cannot upload to this folder.'); return; }
    const targetFolderId = actionTargetFolderId ?? activeFolderId;
    for (const file of Array.from(files)) {
      if (isMediaFile(file) && file.size > DOCUMENT_MEDIA_MAX_BYTES) { showToast('error', `${file.name} exceeds the 10 MB limit for audio/video (${formatDocumentBytes(file.size)}).`); continue; }
      const transferId = createTransferId(`upload-${file.name}`);
      upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: 0 });
      try {
        await uploadDocumentWithProgress({ file, title: file.name, folder_id: targetFolderId, cabinet_id: targetFolderId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined, visibility: visibilityForRoot(uploadVisibility, targetFolderId == null), customer_id: customerId, project_id: projectId, tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean), ...memberPayload(uploadMembers) }, (p) => upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: p }));
        await invalidateDocuments();
        showToast('success', `${file.name} uploaded`);
      } catch (err) { showToast('error', sanitizeErrorMessage(err, `Upload failed for ${file.name}`)); }
      finally { upsertTransfer(transferId, { name: file.name, kind: 'upload', percent: 100 }); removeTransfer(transferId); }
    }
    if (opts?.closeModal) { setShowUpload(false); setUploadTags(''); setUploadMembers([]); setActionTargetFolderId(null); }
  }, [actionTargetFolderId, activeFolderId, canContribute, customerId, invalidateDocuments, online, projectId, removeTransfer, showToast, uploadMembers, uploadTags, uploadVisibility, upsertTransfer, effectiveCabinetId]);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    const accessError = validateAccessSelection(folderVisibility, folderMembers);
    if (accessError) { showToast('error', accessError); return; }
    const parentId = createFolderParentId ?? activeFolderId;
    const parentFolder = parentId ? [...subfolders, ...flatFolders, ...(contents?.folder ? [contents.folder] : [])].find((x) => x.id === parentId) : null;
    if (!canCreateSubfolderAtDepth(parentFolder?.depth ?? 0)) { showToast('error', `Folders can only be nested up to ${DOCUMENTS_MAX_FOLDER_DEPTH} levels.`); return; }
    try {
      const folder = await createFolder.mutateAsync({ name: folderName.trim(), visibility: visibilityForRoot(folderVisibility, parentId == null), parent_id: parentId, cabinet_id: parentId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined, ...memberPayload(folderMembers) });
      setShowCreateFolder(false); setFolderName(''); setFolderMembers([]); setCreateFolderParentId(null);
      setFolderVisibility(activeFolderId ? 'inherit' : 'all_staff'); setActiveFolderId(folder.id);
      await invalidateDocuments();
    } catch {}
  };

  const handleCreateLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    const accessError = validateAccessSelection(uploadVisibility, uploadMembers);
    if (accessError) { showToast('error', accessError); return; }
    const targetFolderId = actionTargetFolderId ?? activeFolderId;
    try {
      await createLink.mutateAsync({ title: linkTitle.trim(), url: linkUrl.trim(), folder_id: targetFolderId, cabinet_id: targetFolderId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined, visibility: visibilityForRoot(uploadVisibility, targetFolderId == null), customer_id: customerId, project_id: projectId, tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean), ...memberPayload(uploadMembers) });
      setShowLink(false); setLinkTitle(''); setLinkUrl(''); setUploadTags(''); setUploadMembers([]); setActionTargetFolderId(null);
      await invalidateDocuments();
    } catch {}
  };

  const handleRenameConfirm = async (name: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.kind === 'folder') await updateFolder.mutateAsync({ id: renameTarget.id, name });
      else { await updateDocument.mutateAsync({ id: renameTarget.id, title: name }); setOpenTabs((t) => t.map((x) => (x.id === renameTarget.id ? { ...x, title: name } : x))); }
      setRenameTarget(null);
      await invalidateDocuments();
    } catch {}
  };

  const openCreateFolderModal = useCallback((parentId: number | null = activeFolderId) => { setCreateFolderParentId(parentId); setFolderVisibility(parentId ? 'inherit' : 'all_staff'); setFolderMembers([]); setFolderName(''); setShowCreateFolder(true); }, [activeFolderId]);
  const openUploadModal = useCallback((fId: number | null = activeFolderId) => { setActionTargetFolderId(fId); setShowUpload(true); }, [activeFolderId]);
  const openLinkModal = useCallback((fId: number | null = activeFolderId) => { setActionTargetFolderId(fId); setShowLink(true); }, [activeFolderId]);

  const handleDeleteFolder = useCallback(async (folder: DocumentFolder) => {
    if (!(await confirm({ title: `Delete "${folder.name}"?`, message: 'This permanently removes the folder and everything inside it.', confirmText: 'Delete folder', variant: 'danger' }))) return;
    await deleteFolder.mutateAsync(folder.id);
    if (activeFolderId === folder.id) { setActiveFolderId(folder.parent_id); setActiveTabId(null); }
    await invalidateDocuments();
  }, [activeFolderId, confirm, deleteFolder, invalidateDocuments]);

  const handleDeleteDocument = useCallback(async (doc: DocumentItem) => {
    if (!(await confirm({ title: `Delete "${doc.title}"?`, message: 'This file will be permanently removed from your vault.', confirmText: 'Delete file', variant: 'danger' }))) return;
    await deleteDocument.mutateAsync(doc.id);
    setOpenTabs((t) => t.filter((x) => x.id !== doc.id));
    if (activeTabId === doc.id) { const r = openTabs.filter((x) => x.id !== doc.id)[0] ?? null; setActiveTabId(r?.id ?? null); if (r?.folder_id != null) setActiveFolderId(r.folder_id); }
    await invalidateDocuments();
  }, [activeTabId, confirm, deleteDocument, invalidateDocuments, openTabs]);

  const triggerImportFolder = useCallback((fId: number | null = activeFolderId) => { if (!online || !canContribute) { showToast('error', 'You cannot import into this folder.'); return; } setImportTargetFolderId(fId); folderImportInputRef.current?.click(); }, [activeFolderId, canContribute, online, showToast]);

  const handleImportFolderFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length || !online) return;
    const targetFolderId = importTargetFolderId ?? activeFolderId;
    const parentFolder = targetFolderId ? [...subfolders, ...flatFolders, ...(contents?.folder ? [contents.folder] : [])].find((x) => x.id === targetFolderId) : null;
    if (!(await confirm({ title: `Import ${files.length} file${files.length === 1 ? '' : 's'}?`, message: 'The folder structure from your computer will be recreated in the vault.', confirmText: 'Import folder', variant: 'warning' }))) return;
    const transferId = createTransferId('folder-import');
    upsertTransfer(transferId, { name: 'Folder import', kind: 'upload', percent: 0 });
    try {
      const result = await importFolderTree({ files, parentFolderId: targetFolderId, parentDepth: parentFolder?.depth ?? 0, visibility: visibilityForRoot(folderVisibility, targetFolderId == null) as FolderVisibility, createFolder: async (p) => { const { data } = await axiosInstance.post(DOCUMENTS.FOLDERS, { ...p, cabinet_id: p.parent_id == null && effectiveCabinetId > 0 ? effectiveCabinetId : p.cabinet_id }); return (data && typeof data === 'object' && 'data' in data) ? (data as { data: DocumentFolder }).data : data as DocumentFolder; }, uploadFile: async (file, fId) => { if (isMediaFile(file) && file.size > DOCUMENT_MEDIA_MAX_BYTES) throw new Error(`${file.name} exceeds the 10 MB audio/video limit.`); await uploadDocumentWithProgress({ file, title: file.name, folder_id: fId, cabinet_id: fId == null && effectiveCabinetId > 0 ? effectiveCabinetId : undefined, visibility: visibilityForRoot(uploadVisibility, fId == null), customer_id: customerId, project_id: projectId, tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean), ...memberPayload(uploadMembers) }); }, onProgress: (_l, done, total) => { upsertTransfer(transferId, { name: 'Folder import', kind: 'upload', percent: Math.min(99, Math.round((done / Math.max(total, 1)) * 100)) }); } });
      await invalidateDocuments();
      const skipped = result.skippedFiles + result.skippedFolders;
      showToast(skipped > 0 ? 'warning' : 'success', skipped > 0 ? `Imported ${result.filesUploaded} files and ${result.foldersCreated} folders. ${skipped} item(s) skipped (depth limit).` : `Imported ${result.filesUploaded} files in ${result.foldersCreated} folders.`);
    } catch (err) { showToast('error', sanitizeErrorMessage(err, 'Folder import failed')); }
    finally { upsertTransfer(transferId, { name: 'Folder import', kind: 'upload', percent: 100 }); removeTransfer(transferId); setImportTargetFolderId(null); if (folderImportInputRef.current) folderImportInputRef.current.value = ''; }
  }, [activeFolderId, confirm, contents?.folder, customerId, flatFolders, folderVisibility, importTargetFolderId, invalidateDocuments, online, projectId, removeTransfer, showToast, subfolders, uploadMembers, uploadTags, uploadVisibility, upsertTransfer, effectiveCabinetId]);

  const handleExportFolder = useCallback(async (folder: DocumentFolder) => {
    if (!online) return;
    const transferId = createTransferId(`export-${folder.id}`); const fileName = `${folder.name}.zip`;
    upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 0 });
    try { await downloadFolderExportWithProgress(folder.id, fileName, (p) => { upsertTransfer(transferId, { name: fileName, kind: 'download', percent: p }); }); showToast('success', `${folder.name} downloaded`); }
    catch (err) { showToast('error', sanitizeErrorMessage(err, 'Folder download failed')); }
    finally { upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 100 }); removeTransfer(transferId); }
  }, [online, removeTransfer, showToast, upsertTransfer]);

  const explorerActions = useMemo<DocumentExplorerActions>(() => ({
    onRenameFolder: (f) => setRenameTarget({ kind: 'folder', id: f.id, name: f.name }),
    onDeleteFolder: (f) => { void handleDeleteFolder(f); },
    onMoveFolder: (f) => setMoveTarget({ kind: 'folder', id: f.id }),
    onCreateSubfolder: (f) => openCreateFolderModal(f.id),
    onUploadToFolder: (fId) => openUploadModal(fId), onAddLinkToFolder: (fId) => openLinkModal(fId),
    onRenameDocument: (d) => setRenameTarget({ kind: 'document', id: d.id, name: d.title }),
    onDeleteDocument: (d) => { void handleDeleteDocument(d); },
    onMoveDocument: (d) => setMoveTarget({ kind: 'document', id: d.id }),
    onSetFolderColor: (f) => setFolderColorTarget(f),
    onManageFolderAccess: (f) => setAccessTarget({ kind: 'folder', id: f.id, name: f.name, visibility: f.visibility, members: f.members ?? [], allowInherit: f.parent_id != null }),
    onManageDocumentAccess: (d) => setAccessTarget({ kind: 'document', id: d.id, name: d.title, visibility: d.visibility, members: d.members ?? [], allowInherit: d.folder_id != null }),
    onImportFolder: (fId) => triggerImportFolder(fId), onExportFolder: (f) => { void handleExportFolder(f); },
    onEmailFolder: (f) => setEmailTarget({ kind: 'vault_folder', id: f.id, label: f.name }),
    onEmailDocument: (d) => setEmailTarget({ kind: 'vault_file', id: d.id, label: d.title, emailSentCount: d.email_sent_count }),
  }), [handleDeleteDocument, handleDeleteFolder, handleExportFolder, openCreateFolderModal, openLinkModal, openUploadModal, triggerImportFolder]);

  const loadMoreDocuments = () => { if (searching || customerId || projectId || activeFolderId == null) { void fetchNextPage(); return; } if (documentsMeta && documentsMeta.current_page < documentsMeta.last_page) setContentsPage((p) => p + 1); };
  const handleRecordView = useCallback((doc: DocumentItem) => { recordView.mutate(doc.id); }, [recordView]);

  const handleDownload = async (doc: DocumentItem) => {
    const transferId = createTransferId(`download-${doc.id}`); const fileName = doc.file_name || doc.title || 'download';
    upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 0 });
    try {
      const result = await recordDownload.mutateAsync(doc.id);
      const url = result.file_url ?? doc.file_url ?? doc.url;
      if (!url) throw new Error('No download URL');
      try { await downloadFileWithProgress(url, fileName, (p) => { upsertTransfer(transferId, { name: fileName, kind: 'download', percent: p }); }); }
      catch { window.open(url, '_blank', 'noopener,noreferrer'); }
    } catch (err) { showToast('error', sanitizeErrorMessage(err, 'Download failed')); }
    finally { upsertTransfer(transferId, { name: fileName, kind: 'download', percent: 100 }); removeTransfer(transferId); }
  };

  const handleMoveConfirm = async (targetId: number | null) => {
    if (!moveTarget) return;
    if (moveTarget.kind === 'folder') { const f = flatFolders.find((x) => x.id === moveTarget.id); if (!f) return; await updateFolder.mutateAsync({ id: moveTarget.id, name: f.name, visibility: f.visibility, parent_id: targetId }); }
    else await updateDocument.mutateAsync({ id: moveTarget.id, folder_id: targetId });
    setMoveTarget(null);
  };

  const handleExplorerDrop = async (targetId: number | null, e: React.DragEvent) => {
    e.preventDefault(); setDropTargetFolderId(null); setPanelDragActive(false);
    const docId = Number(e.dataTransfer.getData('text/document-id')); const draggedFolderId = Number(e.dataTransfer.getData('text/document-folder-id'));
    try {
      if (docId) { await updateDocument.mutateAsync({ id: docId, folder_id: targetId }); showToast('success', 'File moved'); return; }
      if (draggedFolderId) {
        if (!canMoveFolderInto(draggedFolderId, targetId, allKnownFolders)) { showToast('error', 'Cannot move a folder into itself or its subfolders.'); return; }
        const draggedFolder = allKnownFolders.find((x) => x.id === draggedFolderId);
        if (draggedFolder) await updateFolder.mutateAsync({ id: draggedFolderId, name: draggedFolder.name, visibility: draggedFolder.visibility, parent_id: targetId });
        else await updateFolder.mutateAsync({ id: draggedFolderId, parent_id: targetId });
        showToast('success', 'Folder moved');
      }
    } catch (err) { showToast('error', sanitizeErrorMessage(err, 'Move failed')); }
  };

  const handleFolderDrop = async (fId: number, e: React.DragEvent) => { await handleExplorerDrop(fId, e); };
  const handlePanelDrop = async (e: React.DragEvent) => { e.preventDefault(); setPanelDragActive(false); setDropTargetFolderId(null); if (e.dataTransfer.files?.length) { await uploadFiles(e.dataTransfer.files); return; } await handleExplorerDrop(activeFolderId, e); };

  const data: DocumentsPanelData = { activeFolderId, viewMode, search, tagFilter, loading, online, showSidebar, effectiveCabinetId, cabinetId, searching, contentsLoading, contentsFetching, canLoadMoreDocuments, canContribute, isViewerOnly, panelDragActive, dropTargetFolderId, transfers, activeTabId, openTabs, activeDocument, previewDoc, contents: contents ?? null, subfolders, documents, documentsMeta, breadcrumbs, allKnownFolders, flatFolders, moveTree, contentLayoutClass, user: user as DocumentsPanelData['user'], canCustomizeVault, isFetchingNextPage, vaultAppearance, cabinet, title, compact, customerId, projectId, rootFolders, folderLabel, activeFolder, resolvedAppearance };
  const handleEmailSent = useCallback((id: number, result: { email_sent_count: number; last_emailed_at?: string | null }) => {
    setOpenTabs((tabs) => tabs.map((tab) => tab.id === id ? { ...tab, email_sent_count: result.email_sent_count, last_emailed_at: result.last_emailed_at ?? null } : tab));
  }, []);

  const actions: DocumentsPanelActions = { setActiveFolderId, setViewMode, setSearch, setTagFilter, setPanelDragActive, setDropTargetFolderId, setPreviewDoc, setShowVaultAppearance, setShowCreateFolder, setShowUpload, setShowLink, setFolderName, setFolderVisibility, setFolderMembers, setUploadVisibility, setUploadMembers, setUploadTags, setLinkTitle, setLinkUrl, setCreateFolderParentId, setActionTargetFolderId, setActiveTabId, setMoveTarget, setRenameTarget, setAccessTarget, setEmailTarget, openDocumentTab, selectDocumentTab, closeDocumentTab, openCreateFolderModal, openUploadModal, openLinkModal, triggerImportFolder, handleDownload, handleRecordView, loadMoreDocuments, handleCreateFolder, handleCreateLink, handleRenameConfirm, handleDeleteFolder, handleDeleteDocument, handleMoveConfirm, handleExplorerDrop, handleFolderDrop, handlePanelDrop, handleExportFolder, handleImportFolderFiles, handleEmailTargetChange: setEmailTarget, handleEmailSent, handleMoveTargetChange: setMoveTarget, handleRenameTargetChange: setRenameTarget, handleAccessTargetChange: setAccessTarget, handleFolderColorTargetChange: setFolderColorTarget, invalidateDocuments, uploadFiles, explorerActions };
  const modalState: DocumentsPanelModalState = { showCreateFolder, showUpload, showLink, showVaultAppearance, previewDoc, moveTarget, renameTarget, accessTarget, folderColorTarget, emailTarget, actionTargetFolderId, folderName, folderVisibility, folderMembers, uploadVisibility, uploadMembers, uploadTags, linkTitle, linkUrl, createFolderParentId };

  return { data, actions, modalState, fileInputRef, folderImportInputRef, createFolder, updateFolder, createLink, updateVaultAppearance, updateDocument };
}
