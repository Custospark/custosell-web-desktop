import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import type { DocumentVisibility, FolderVisibility } from '../api/documentTypes';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { MoveItemModal } from './MoveItemModal';
import { RenameItemModal } from './RenameItemModal';
import { DocumentsVaultAppearanceModal } from './DocumentsVaultAppearanceModal';
import { DocumentFolderColorModal } from './DocumentFolderColorModal';
import { DocumentAccessModal } from './DocumentAccessModal';
import { DocumentAccessSection } from './DocumentAccessSection';
import { DocumentFormSection, DocumentIconField, DocumentModalFooter, DocumentModalHero, documentInputClass } from './documentFormFields';
import SendVaultEmailModal from '../../../shared/components/email/SendVaultEmailModal';
import { DocumentProgressBar } from './DocumentProgressBar';
import { FolderPlus, Link2, Shield, Tag, Type, Upload } from 'lucide-react';
import type { DocumentsPanelData, DocumentsPanelActions, DocumentsPanelModalState } from './useDocumentsPanel';
import type { DocumentFolder, DocumentItem, DocumentsVaultAppearance } from '../api/documentTypes';
import type { DocumentPayload, FolderPayload } from '../api/useDocumentQueries';

interface DocumentsPanelModalsProps {
  data: DocumentsPanelData;
  actions: DocumentsPanelActions;
  modalState: DocumentsPanelModalState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  createFolder: { isPending: boolean; mutateAsync: (args: FolderPayload) => Promise<DocumentFolder> };
  createLink: { isPending: boolean; mutateAsync: (args: DocumentPayload & { title: string; url: string }) => Promise<DocumentItem> };
  updateFolder: { isPending: boolean; mutateAsync: (args: Partial<FolderPayload> & { id: number }) => Promise<DocumentFolder> };
  updateDocument: { isPending: boolean; mutateAsync: (args: Partial<DocumentPayload> & { id: number }) => Promise<DocumentItem> };
  updateVaultAppearance: { isPending: boolean; mutateAsync: (args: Partial<DocumentsVaultAppearance>) => Promise<DocumentsVaultAppearance> };
}

export function DocumentsPanelModals({ data, actions, modalState, fileInputRef, createFolder, createLink, updateFolder, updateDocument, updateVaultAppearance }: DocumentsPanelModalsProps) {
  const { showSidebar, activeFolderId, cabinet, canContribute, moveTree, transfers } = data;
  const { handleDownload, handleRecordView, handleMoveConfirm, handleRenameConfirm, invalidateDocuments, handleCreateFolder, handleCreateLink, uploadFiles } = actions;
  const { showCreateFolder, showUpload, showLink, showVaultAppearance, previewDoc, moveTarget, renameTarget, accessTarget, folderColorTarget, emailTarget, actionTargetFolderId, folderName, folderVisibility, folderMembers, uploadVisibility, uploadMembers, uploadTags, linkTitle, linkUrl, createFolderParentId } = modalState;
  const { setShowCreateFolder, setShowUpload, setShowLink, setShowVaultAppearance, setPreviewDoc, setFolderName, setFolderVisibility, setFolderMembers, setUploadVisibility, setUploadMembers, setUploadTags, setLinkTitle, setLinkUrl, setCreateFolderParentId, setActionTargetFolderId } = actions;

  const modalHandlers = { handleCreateFolder: () => void handleCreateFolder(), handleCreateLink: () => void handleCreateLink() };

  return (
    <>
      {!showSidebar && (
        <DocumentPreviewModal
          document={previewDoc} open={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)}
          onDownload={(doc) => void handleDownload(doc)} onRecordView={(doc) => { handleRecordView(doc); }}
        />
      )}
      <MoveItemModal open={Boolean(moveTarget)} onClose={() => actions.handleMoveTargetChange(null)}
        title={moveTarget?.kind === 'folder' ? 'Move folder' : 'Move document'}
        tree={moveTree} movingFolderId={moveTarget?.kind === 'folder' ? moveTarget.id : null}
        allowRoot={moveTarget?.kind === 'folder' ? Boolean(cabinet?.can_manage ?? true) : canContribute}
        loading={updateFolder.isPending || updateDocument.isPending}
        onConfirm={(targetId) => void handleMoveConfirm(targetId)}
      />
      <RenameItemModal open={Boolean(renameTarget)} onClose={() => actions.handleRenameTargetChange(null)}
        title={renameTarget?.kind === 'folder' ? 'Rename folder' : 'Rename document'}
        initialName={renameTarget?.name ?? ''} loading={updateFolder.isPending || updateDocument.isPending}
        onConfirm={(name) => void handleRenameConfirm(name)}
      />
      <Modal isOpen={showCreateFolder} onClose={() => { setShowCreateFolder(false); setCreateFolderParentId(null); }} title="Create folder" size="lg">
        <div className="space-y-5">
          <DocumentModalHero icon={FolderPlus} title="New folder" description="Organize files inside this cabinet with optional access rules." tone="indigo" />
          <DocumentFormSection title="Folder details" icon={Type}>
            <DocumentIconField label="Folder name" icon={Type} required>
              <input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder name" className={documentInputClass} autoFocus />
            </DocumentIconField>
          </DocumentFormSection>
          <DocumentFormSection title="Who can access" icon={Shield}>
            <DocumentAccessSection visibility={folderVisibility} onVisibilityChange={(v) => setFolderVisibility(v as FolderVisibility)} selectedMembers={folderMembers} onSelectedMembersChange={setFolderMembers} allowInherit={Boolean(createFolderParentId)} />
          </DocumentFormSection>
          <DocumentModalFooter>
            <Button type="button" variant="secondary" onClick={() => { setShowCreateFolder(false); setCreateFolderParentId(null); }}>Cancel</Button>
            <Button type="button" loading={createFolder.isPending} onClick={modalHandlers.handleCreateFolder}>Create folder</Button>
          </DocumentModalFooter>
        </div>
      </Modal>
      <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); setActionTargetFolderId(null); }} title="Upload files" size="lg">
        <div className="space-y-5">
          <DocumentModalHero icon={Upload} title="Upload files" description="Drag files here or browse from your computer." tone="blue" />
          {transfers.filter((t) => t.kind === 'upload').length > 0 && (
            <DocumentFormSection title="Uploading files" icon={Upload}>
              <div className="space-y-3">
                {transfers.filter((t) => t.kind === 'upload').map((transfer) => (
                  <DocumentProgressBar key={transfer.id} label={transfer.name} percent={transfer.percent} />
                ))}
              </div>
            </DocumentFormSection>
          )}
          <DocumentFormSection title="Files" icon={Upload}>
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void uploadFiles(e.dataTransfer.files, { closeModal: true }); }}>
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Drag and drop files here, or browse</p>
              <Button type="button" className="mt-3" variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose files</Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => void uploadFiles(e.target.files, { closeModal: true })} />
            </div>
          </DocumentFormSection>
          <DocumentFormSection title="Tags & access" icon={Tag}>
            <DocumentIconField label="Tags" icon={Tag} hint="Comma-separated labels for search.">
              <input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="Tags (comma separated)" className={documentInputClass} />
            </DocumentIconField>
            <DocumentAccessSection visibility={uploadVisibility} onVisibilityChange={(v) => setUploadVisibility(v as DocumentVisibility)} selectedMembers={uploadMembers} onSelectedMembersChange={setUploadMembers} allowInherit={Boolean(actionTargetFolderId ?? activeFolderId)} />
          </DocumentFormSection>
          <DocumentModalFooter>
            <Button type="button" variant="secondary" onClick={() => { setShowUpload(false); setActionTargetFolderId(null); }}>Close</Button>
          </DocumentModalFooter>
        </div>
      </Modal>
      <Modal isOpen={showLink} onClose={() => { setShowLink(false); setActionTargetFolderId(null); }} title="Add link" size="lg">
        <div className="space-y-5">
          <DocumentModalHero icon={Link2} title="Save a link" description="Store a website or shared URL alongside your files." tone="emerald" />
          <DocumentFormSection title="Link details" icon={Link2}>
            <DocumentIconField label="Title" icon={Type} required>
              <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title" className={documentInputClass} />
            </DocumentIconField>
            <DocumentIconField label="URL" icon={Link2} required>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={documentInputClass} />
            </DocumentIconField>
            <DocumentIconField label="Tags" icon={Tag} hint="Comma-separated labels for search.">
              <input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="Tags (comma separated)" className={documentInputClass} />
            </DocumentIconField>
          </DocumentFormSection>
          <DocumentFormSection title="Who can access" icon={Shield}>
            <DocumentAccessSection visibility={uploadVisibility} onVisibilityChange={(v) => setUploadVisibility(v as DocumentVisibility)} selectedMembers={uploadMembers} onSelectedMembersChange={setUploadMembers} allowInherit={Boolean(actionTargetFolderId ?? activeFolderId)} />
          </DocumentFormSection>
          <DocumentModalFooter>
            <Button type="button" variant="secondary" onClick={() => { setShowLink(false); setActionTargetFolderId(null); }}>Cancel</Button>
            <Button type="button" loading={createLink.isPending} onClick={modalHandlers.handleCreateLink}>Add link</Button>
          </DocumentModalFooter>
        </div>
      </Modal>
      <DocumentsVaultAppearanceModal open={showVaultAppearance} appearance={data.vaultAppearance ?? {}} saving={updateVaultAppearance.isPending} onClose={() => setShowVaultAppearance(false)} onSave={(appearance) => { void updateVaultAppearance.mutateAsync(appearance).then(() => setShowVaultAppearance(false)); }} />
      <DocumentFolderColorModal folder={folderColorTarget} saving={updateFolder.isPending} onClose={() => actions.handleFolderColorTargetChange(null)} onSave={(color) => { if (!folderColorTarget) return; void updateFolder.mutateAsync({ id: folderColorTarget.id, cover_color: color }).then(() => actions.handleFolderColorTargetChange(null)); }} />
      <DocumentAccessModal open={Boolean(accessTarget)} title={accessTarget?.kind === 'folder' ? 'Folder access' : 'File access'} itemLabel={accessTarget?.name ?? ''} visibility={accessTarget?.visibility ?? 'all_staff'} members={accessTarget?.members ?? []} allowInherit={accessTarget?.allowInherit ?? false} loading={updateFolder.isPending || updateDocument.isPending} onClose={() => actions.handleAccessTargetChange(null)} onSave={(payload) => { if (!accessTarget) return; if (accessTarget.kind === 'folder') { void updateFolder.mutateAsync({ id: accessTarget.id, visibility: payload.visibility as FolderVisibility, member_user_ids: payload.member_user_ids, member_roles: payload.member_roles }).then(() => { actions.handleAccessTargetChange(null); void invalidateDocuments(); }); return; } void updateDocument.mutateAsync({ id: accessTarget.id, visibility: payload.visibility as DocumentVisibility, member_user_ids: payload.member_user_ids, member_roles: payload.member_roles }).then(() => { actions.handleAccessTargetChange(null); void invalidateDocuments(); }); }} />
      {emailTarget && (
        <SendVaultEmailModal open onClose={() => actions.handleEmailTargetChange(null)} kind={emailTarget.kind} targetId={emailTarget.id} targetLabel={emailTarget.label} emailSentCount={emailTarget.emailSentCount} onSent={(result) => { if (emailTarget.kind === 'vault_file') actions.handleEmailSent(emailTarget.id, result); actions.handleEmailTargetChange(null); void invalidateDocuments(); }} />
      )}
    </>
  );
}
