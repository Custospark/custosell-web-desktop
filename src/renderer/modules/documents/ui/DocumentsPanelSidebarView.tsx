import { useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { surfaceAppearanceStyle } from '../../../shared/utils/surfaceStyles';
import { DocumentExplorer } from './DocumentExplorer';
import { DocumentOpenTabs } from './DocumentOpenTabs';
import { DocumentDetailPane } from './DocumentDetailPane';
import { DocumentProgressBar } from './DocumentProgressBar';
import { FolderOpen, FileText, WifiOff } from 'lucide-react';
import type { DocumentsPanelData, DocumentsPanelActions } from './useDocumentsPanel';

type MobileView = 'explorer' | 'content';

interface DocumentsPanelSidebarViewProps {
  data: DocumentsPanelData;
  actions: DocumentsPanelActions;
}

export function DocumentsPanelSidebarView({ data, actions }: DocumentsPanelSidebarViewProps) {
  const [mobileView, setMobileView] = useState<MobileView>('content');
  const {
    activeFolderId, activeTabId, activeDocument, openTabs, search, tagFilter,
    dropTargetFolderId, panelDragActive, online, canContribute, isViewerOnly,
    effectiveCabinetId, cabinetId, contentsLoading, transfers,
    cabinet, title, breadcrumbs, folderLabel, activeFolder, resolvedAppearance,
  } = data;

  const {
    setSearch, setTagFilter, setActiveFolderId, setActiveTabId, setPanelDragActive,
    setDropTargetFolderId, openDocumentTab, selectDocumentTab, closeDocumentTab,
    openCreateFolderModal, openUploadModal, openLinkModal, triggerImportFolder,
    handleDownload, handleRecordView, handleRenameTargetChange, handleMoveTargetChange,
    handleAccessTargetChange, handleEmailTargetChange, setShowVaultAppearance, handleExplorerDrop,
    handlePanelDrop, invalidateDocuments, explorerActions,
  } = actions;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row" style={surfaceAppearanceStyle(resolvedAppearance)}>
      {/* Mobile view toggle */}
      <div className="flex shrink-0 border-b border-white/40 bg-white/85 backdrop-blur-sm lg:hidden">
        <button type="button" onClick={() => setMobileView('explorer')}
          className={cn('flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors', mobileView === 'explorer' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')}>
          <FolderOpen className="h-4 w-4" />
          <span>Folders</span>
        </button>
        <button type="button" onClick={() => setMobileView('content')}
          className={cn('flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors', mobileView === 'content' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')}>
          <FileText className="h-4 w-4" />
          <span>Files</span>
        </button>
      </div>

      {/* Explorer sidebar */}
      <aside className={cn(
        'w-full shrink-0 flex-col p-1.5 sm:p-2 lg:flex lg:h-full lg:max-h-none lg:min-h-0 lg:w-80 xl:w-96',
        mobileView === 'explorer' ? 'flex h-full min-h-0 overflow-hidden' : 'hidden lg:flex',
      )}>
        <DocumentExplorer
          cabinetId={effectiveCabinetId} cabinetName={cabinet?.name ?? title}
          cabinetVisibility={cabinet?.visibility} cabinetMemberRole={cabinet?.current_member_role}
          activeFolderId={activeFolderId} selectedDocumentId={activeTabId}
          openDocumentIds={openTabs.map((t) => t.id)} expandFolderIds={breadcrumbs.map((c) => c.id)}
          searchQuery={search} tagFilter={tagFilter} dropTargetFolderId={dropTargetFolderId}
          online={online} canContribute={canContribute} isViewerOnly={isViewerOnly}
          actions={explorerActions} onSearchChange={setSearch} onTagFilterChange={setTagFilter}
          onSelectFolder={(fId) => { setActiveFolderId(fId); setActiveTabId(null); }}
          onSelectDocument={openDocumentTab}
          onCreateFolder={() => openCreateFolderModal(activeFolderId)}
          onUpload={() => openUploadModal(activeFolderId)}
          onCreateLink={() => openLinkModal(activeFolderId)}
          onImportFolder={() => triggerImportFolder(activeFolderId)}
          onRefresh={() => { void invalidateDocuments(); }}
          onFolderDragOver={(fId, e) => { e.preventDefault(); setDropTargetFolderId(fId ?? 'root'); }}
          onFolderDragLeave={() => setDropTargetFolderId(null)}
          onFolderDrop={(fId, e) => void handleExplorerDrop(fId, e)}
          onDocumentDragStart={(doc, e) => { e.dataTransfer.setData('text/document-id', String(doc.id)); e.dataTransfer.effectAllowed = 'move'; }}
          onFolderDragStart={(folder, e) => { e.dataTransfer.setData('text/document-folder-id', String(folder.id)); e.dataTransfer.effectAllowed = 'move'; }}
          onCustomizeCanvas={data.canCustomizeVault && !cabinetId ? () => setShowVaultAppearance(true) : undefined}
        />
      </aside>

      {/* Content panel */}
      <div className={cn(
        'm-1.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 shadow-sm sm:m-2',
        panelDragActive && canContribute && 'ring-2 ring-inset ring-indigo-300',
        mobileView === 'content' ? 'flex' : 'hidden lg:flex',
      )}
        onDragOver={(e) => { if (!canContribute || !online) return; e.preventDefault(); setPanelDragActive(true); }}
        onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setPanelDragActive(false); }}
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
        <DocumentOpenTabs tabs={openTabs} activeTabId={activeTabId} onSelectTab={selectDocumentTab} onCloseTab={closeDocumentTab} />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <DocumentDetailPane
            document={activeDocument} folder={activeFolder} folderName={folderLabel}
            loading={Boolean(activeFolderId && contentsLoading && !activeTabId)}
            online={online} canContribute={canContribute}
            onUpload={() => openUploadModal(activeFolderId)}
            onCreateLink={() => openLinkModal(activeFolderId)}
            onCreateFolder={() => openCreateFolderModal(null)}
            onCreateSubfolder={() => activeFolderId && openCreateFolderModal(activeFolderId)}
            onDownload={(doc) => void handleDownload(doc)}
            onRename={(doc) => handleRenameTargetChange({ kind: 'document', id: doc.id, name: doc.title })}
            onMove={(doc) => handleMoveTargetChange({ kind: 'document', id: doc.id })}
            onDelete={(doc) => { void actions.handleDeleteDocument(doc); }}
            onRenameFolder={() => { if (!activeFolder) return; handleRenameTargetChange({ kind: 'folder', id: activeFolder.id, name: activeFolder.name }); }}
            onMoveFolder={() => { if (!activeFolder) return; handleMoveTargetChange({ kind: 'folder', id: activeFolder.id }); }}
            onDeleteFolder={() => { if (!activeFolder) return; void actions.handleDeleteFolder(activeFolder); }}
            onExportFolder={() => { if (!activeFolder) return; void actions.handleExportFolder(activeFolder); }}
            onEmailFolder={() => { if (!activeFolder) return; handleEmailTargetChange({ kind: 'vault_folder', id: activeFolder.id, label: activeFolder.name }); }}
            onEmailDocument={(doc) => handleEmailTargetChange({ kind: 'vault_file', id: doc.id, label: doc.title, emailSentCount: doc.email_sent_count })}
            onClose={() => activeTabId && closeDocumentTab(activeTabId)}
            onManageFolderAccess={() => { if (!activeFolder) return; handleAccessTargetChange({ kind: 'folder', id: activeFolder.id, name: activeFolder.name, visibility: activeFolder.visibility, members: activeFolder.members ?? [], allowInherit: activeFolder.parent_id != null }); }}
            onManageDocumentAccess={(doc) => handleAccessTargetChange({ kind: 'document', id: doc.id, name: doc.title, visibility: doc.visibility, members: doc.members ?? [], allowInherit: doc.folder_id != null })}
            onRecordView={handleRecordView}
          />
        </div>
        {transfers.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
            <div className="space-y-2">
              {transfers.map((transfer) => (
                <DocumentProgressBar key={transfer.id} label={`${transfer.kind === 'upload' ? 'Uploading' : 'Downloading'} ${transfer.name}`} percent={transfer.percent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
