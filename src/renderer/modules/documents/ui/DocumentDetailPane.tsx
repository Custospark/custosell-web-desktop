import { useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import { ACCESS_VISIBILITY_LABEL } from '../api/documentAccessLabels';
import { documentPrimaryLabel, documentSecondaryLabel } from '../api/documentDisplayUtils';
import {
  canInlineViewDocument,
  isAudioDocument,
  isImageDocument,
  isPdfDocument,
  isTextViewableDocument,
  isVideoDocument,
} from '../api/documentFileViewUtils';
import { formatDocumentBytes } from '../api/documentTransferUtils';
import { DocumentRichFileViewer } from './DocumentRichFileViewer';
import { DocumentActionButton } from './DocumentActionButton';
import { DocumentFolderIcon, DocumentItemIcon } from './documentFileIcons';
import { DocumentUserAttribution } from './DocumentUserAttribution';
import { DocumentTagChips } from './DocumentTagStrip';
import { resolveFolderColor } from '../api/documentColorUtils';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import {
  Download,
  ExternalLink,
  FolderInput,
  FolderPlus,
  Link2,
  Mail,
  Pencil,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface DocumentPreviewContentProps {
  document: DocumentItem;
  className?: string;
  online?: boolean;
}

export function DocumentPreviewContent({ document, className, online = true }: DocumentPreviewContentProps) {
  const pdf = isPdfDocument(document);
  const image = isImageDocument(document);
  const audio = isAudioDocument(document);
  const video = isVideoDocument(document);
  const textViewable = isTextViewableDocument(document);
  const previewUrl = document.file_url;
  const richMediaOrText = audio || video || textViewable;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-gray-50', className)}>
      {pdf && previewUrl && (
        <iframe
          title={document.title}
          src={previewUrl}
          className="h-full min-h-[480px] w-full bg-white"
        />
      )}
      {image && previewUrl && (
        <div className="flex min-h-[320px] items-center justify-center p-6">
          <img src={previewUrl} alt={document.title} className="max-h-[70vh] max-w-full object-contain" />
        </div>
      )}
      {richMediaOrText && (
        <DocumentRichFileViewer document={document} online={online} />
      )}
      {document.type === 'link' && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <DocumentItemIcon doc={document} size="md" />
          <p className="text-sm font-medium text-gray-900">{document.title}</p>
          {document.url && (
            <a href={document.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-indigo-600 hover:underline">
              {document.url}
            </a>
          )}
        </div>
      )}
      {!pdf && !image && !richMediaOrText && document.type !== 'link' && null}
    </div>
  );
}

interface DocumentFileDetailViewProps {
  document: DocumentItem;
  className?: string;
}

/** File metadata panel for types without inline preview (matches list/card file display). */
export function DocumentFileDetailView({ document, className }: DocumentFileDetailViewProps) {
  const label = documentPrimaryLabel(document);
  const secondary = documentSecondaryLabel(document);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 sm:p-8', className)}>
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-slate-100 p-3">
          <DocumentItemIcon doc={document} size="md" className="!h-10 !w-10" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-gray-900" title={label}>{label}</p>
          {secondary && (
            <p className="mt-0.5 truncate text-sm text-gray-500" title={secondary}>{secondary}</p>
          )}
          {document.description && (
            <p className="mt-3 text-sm text-gray-600">{document.description}</p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />
        <DocumentTagChips tags={document.tags} className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
          <span>{formatDocumentBytes(document.file_size)}</span>
          {document.mime_type && <span>{document.mime_type}</span>}
        </div>
      </div>
    </div>
  );
}

interface DocumentDetailPaneProps {
  document: DocumentItem | null;
  folder?: DocumentFolder | null;
  folderName?: string | null;
  loading?: boolean;
  online: boolean;
  canContribute?: boolean;
  onUpload?: () => void;
  onCreateLink?: () => void;
  onCreateFolder?: () => void;
  onCreateSubfolder?: () => void;
  onDownload?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onMove?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onRenameFolder?: () => void;
  onMoveFolder?: () => void;
  onDeleteFolder?: () => void;
  onManageFolderAccess?: () => void;
  onManageDocumentAccess?: (doc: DocumentItem) => void;
  onExportFolder?: () => void;
  onEmailFolder?: () => void;
  onEmailDocument?: (doc: DocumentItem) => void;
  onClose?: () => void;
  onRecordView?: (doc: DocumentItem) => void;
}

export function DocumentDetailPane({
  document,
  folder,
  folderName,
  loading = false,
  online,
  canContribute = true,
  onUpload,
  onCreateLink,
  onCreateFolder,
  onCreateSubfolder,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onManageFolderAccess,
  onManageDocumentAccess,
  onExportFolder,
  onEmailFolder,
  onEmailDocument,
  onClose,
  onRecordView,
}: DocumentDetailPaneProps) {
  const lastRecordedViewId = useRef<number | null>(null);

  useEffect(() => {
    if (!document?.id || !onRecordView) {
      if (!document?.id) lastRecordedViewId.current = null;
      return;
    }
    if (lastRecordedViewId.current === document.id) return;
    lastRecordedViewId.current = document.id;
    onRecordView(document);
  }, [document?.id, onRecordView]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!document) {
    const visibilityLabel = folder?.effective_visibility ?? folder?.visibility;
    const accessLabel = visibilityLabel ? ACCESS_VISIBILITY_LABEL[visibilityLabel] : null;

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className={cn('w-full p-5 sm:p-6', DOCUMENT_SURFACE.panel)}>
            <div className="flex items-center gap-3">
              <DocumentFolderIcon open size="md" className="!h-8 !w-8" tint={folder ? resolveFolderColor(folder) : undefined} />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-gray-900">
                  {folderName ?? 'All documents'}
                </p>
                {accessLabel && (
                  <p className="text-xs text-gray-500">Access: {accessLabel}</p>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {folder
                ? 'Pick a file from the list on the left, or add something new to this folder.'
                : 'Browse folders on the left, or start by uploading a file or creating a folder.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {onUpload && (
                <DocumentActionButton
                  icon={<Upload className="h-4 w-4" />}
                  label="Upload file"
                  description={folder ? `Add to ${folder.name}` : 'Add to root'}
                  onClick={onUpload}
                  disabled={!online || !canContribute}
                />
              )}
              {onCreateLink && (
                <DocumentActionButton
                  icon={<Link2 className="h-4 w-4" />}
                  label="Add link"
                  description="Save a website or shared URL"
                  onClick={onCreateLink}
                  disabled={!online || !canContribute}
                />
              )}
              {onCreateSubfolder && folder && (
                <DocumentActionButton
                  icon={<FolderPlus className="h-4 w-4" />}
                  label="New subfolder"
                  description="Organize files inside this folder"
                  onClick={onCreateSubfolder}
                  disabled={!online}
                />
              )}
              {!folder && onCreateFolder && (
                <DocumentActionButton
                  icon={<FolderPlus className="h-4 w-4" />}
                  label="New folder"
                  description="Create a top-level folder"
                  onClick={onCreateFolder}
                  disabled={!online}
                />
              )}
            </div>

            {folder && (folder.can_manage || folder.can_delete) && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Folder actions</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {onRenameFolder && folder.can_manage && (
                    <DocumentActionButton
                      icon={<Pencil className="h-4 w-4" />}
                      label="Rename folder"
                      onClick={onRenameFolder}
                      disabled={!online}
                    />
                  )}
                  {onManageFolderAccess && folder.can_manage && (
                    <DocumentActionButton
                      icon={<Shield className="h-4 w-4" />}
                      label="Manage access"
                      description="Control who can view and edit"
                      onClick={onManageFolderAccess}
                      disabled={!online}
                    />
                  )}
                  {onMoveFolder && folder.can_manage && (
                    <DocumentActionButton
                      icon={<FolderInput className="h-4 w-4" />}
                      label="Move folder"
                      onClick={onMoveFolder}
                      disabled={!online}
                    />
                  )}
                  {onExportFolder && folder.can_view && (
                    <DocumentActionButton
                      icon={<Download className="h-4 w-4" />}
                      label="Download folder"
                      description="Zip this folder and all nested files"
                      onClick={onExportFolder}
                      disabled={!online}
                    />
                  )}
                  {onEmailFolder && folder.can_view && (
                    <DocumentActionButton
                      icon={<Mail className="h-4 w-4" />}
                      label="Email folder"
                      description="Send zipped folder to staff or external recipient"
                      onClick={onEmailFolder}
                      disabled={!online}
                    />
                  )}
                  {onDeleteFolder && folder.can_delete && (
                    <DocumentActionButton
                      icon={<Trash2 className="h-4 w-4" />}
                      label="Delete folder"
                      description="Removes this folder and everything inside"
                      onClick={onDeleteFolder}
                      disabled={!online}
                      danger
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const label = documentPrimaryLabel(document);
  const showInlinePreview = document.type === 'link' || canInlineViewDocument(document);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white/80 backdrop-blur-md">
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/50 bg-white/75 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <DocumentItemIcon doc={document} size="md" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900" title={label}>{label}</p>
            {document.file_name && document.file_name !== document.title && (
              <p className="truncate text-xs text-gray-500" title={document.file_name}>{document.file_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onClose && (
            <Button type="button" variant="secondary" size="sm" onClick={onClose} title="Close file">
              <X className="h-4 w-4" /> Close
            </Button>
          )}
          {document.url && (
            <Button type="button" variant="secondary" size="sm" onClick={() => window.open(document.url!, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4" /> Open link
            </Button>
          )}
          {document.file_url && onDownload && (
            <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => onDownload(document)}>
              <Download className="h-4 w-4" /> Download
            </Button>
          )}
          {document.can_view && onEmailDocument && document.type !== 'link' && (
            <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => onEmailDocument(document)}>
              <Mail className="h-4 w-4" /> Email
            </Button>
          )}
          {(document.can_edit || document.can_manage) && onRename && (
            <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => onRename(document)}>
              <Pencil className="h-4 w-4" /> Rename
            </Button>
          )}
          {(document.can_edit || document.can_manage) && onMove && (
            <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => onMove(document)}>
              <FolderInput className="h-4 w-4" /> Move
            </Button>
          )}
          {document.can_manage && onManageDocumentAccess && (
            <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => onManageDocumentAccess(document)}>
              <Shield className="h-4 w-4" /> Access
            </Button>
          )}
          {document.can_delete && onDelete && (
            <Button type="button" variant="danger" size="sm" disabled={!online} onClick={() => onDelete(document)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {showInlinePreview ? (
          <>
            <DocumentPreviewContent document={document} className="min-h-[420px]" online={online} />
            <div className={cn('mt-4 px-4 py-3', DOCUMENT_SURFACE.panel)}>
              <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />
              <DocumentTagChips tags={document.tags} className="mt-3" />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>{formatDocumentBytes(document.file_size)}</span>
                {document.mime_type && <span>{document.mime_type}</span>}
              </div>
            </div>
          </>
        ) : (
          <DocumentFileDetailView document={document} />
        )}
      </div>
    </div>
  );
}
