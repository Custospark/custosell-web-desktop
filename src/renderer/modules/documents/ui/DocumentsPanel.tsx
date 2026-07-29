import { useDocumentsPanel } from './useDocumentsPanel';
import { DocumentsPanelCardsView } from './DocumentsPanelUI';
import { DocumentsPanelSidebarView } from './DocumentsPanelSidebarView';
import { DocumentsPanelModals } from './DocumentsPanelModals';
import type { DocumentCabinet } from '../api/documentTypes';

interface DocumentsPanelProps {
  cabinetId?: number;
  cabinet?: DocumentCabinet | null;
  folderId?: number | null;
  customerId?: number;
  projectId?: number;
  title?: string;
  compact?: boolean;
  fullBleed?: boolean;
}

export default function DocumentsPanel(props: DocumentsPanelProps) {
  const { data, actions, modalState, fileInputRef, folderImportInputRef, createFolder, updateFolder, createLink, updateVaultAppearance, updateDocument } = useDocumentsPanel(props);
  const { showSidebar, online, loading, canContribute } = data;
  const { openCreateFolderModal, openUploadModal, openLinkModal, handleImportFolderFiles } = actions;

  if (showSidebar) {
    return (
      <>
        <DocumentsPanelSidebarView data={data} actions={actions} />
        <DocumentsPanelModals data={data} actions={actions} modalState={modalState} fileInputRef={fileInputRef}
          createFolder={createFolder} createLink={createLink} updateFolder={updateFolder}
          updateDocument={updateDocument} updateVaultAppearance={updateVaultAppearance} />
        <input ref={folderImportInputRef} type="file" className="hidden"
          // @ts-expect-error webkitdirectory is supported in Chromium/Electron
          webkitdirectory="" multiple onChange={(e) => void handleImportFolderFiles(e.target.files)} />
      </>
    );
  }

  return (
    <>
      <DocumentsPanelCardsView data={data} actions={actions} online={online} loading={loading}
        canContribute={canContribute}
        onOpenCreateFolderModal={() => openCreateFolderModal(data.activeFolderId)}
        onOpenUploadModal={() => openUploadModal(data.activeFolderId)}
        onOpenLinkModal={() => openLinkModal(data.activeFolderId)} />
      <DocumentsPanelModals data={data} actions={actions} modalState={modalState} fileInputRef={fileInputRef}
        createFolder={createFolder} createLink={createLink} updateFolder={updateFolder}
        updateDocument={updateDocument} updateVaultAppearance={updateVaultAppearance} />
      <input ref={folderImportInputRef} type="file" className="hidden"
        // @ts-expect-error webkitdirectory is supported in Chromium/Electron
        webkitdirectory="" multiple onChange={(e) => void handleImportFolderFiles(e.target.files)} />
    </>
  );
}
