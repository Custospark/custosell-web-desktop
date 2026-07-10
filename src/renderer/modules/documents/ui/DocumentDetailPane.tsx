import { useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentFolder, DocumentItem } from '../api/documentTypes';
import { ACCESS_VISIBILITY_LABEL } from '../api/documentAccessLabels';
import { documentPrimaryLabel } from '../api/documentDisplayUtils';
import { formatDocumentBytes, isImageDocument, isPdfDocument } from '../api/documentTransferUtils';
import { DocumentActionButton } from './DocumentActionButton';
import { DocumentFolderIcon, DocumentItemIcon } from './documentFileIcons';
import { DocumentUserAttribution } from './DocumentUserAttribution';
import { DocumentTagChips } from './DocumentTagStrip';
import { resolveFolderColor } from '../api/documentColorUtils';
import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';
import {
  ChevronRight,
  Download,
  ExternalLink,
  FolderInput,
  FolderPlus,
  Home,
  Link2,
  Pencil,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';

interface DocumentPreviewContentProps {
  document: DocumentItem;
  className?: string;
}

export function DocumentPreviewContent({ document, className }: DocumentPreviewContentProps) {
  const pdf = isPdfDocument(document);
  const image = isImageDocument(document);
  const previewUrl = document.file_url;

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
      {!pdf && !image && document.type !== 'link' && (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <DocumentItemIcon doc={document} size="md" />
          <p className="text-sm font-medium text-gray-700">Preview not available for this file type</p>
          <p className="text-xs text-gray-500">{formatDocumentBytes(document.file_size)}</p>
        </div>
      )}
    </div>
  );
}

interface DocumentDetailPaneProps {
  document: DocumentItem | null;
  folder?: DocumentFolder | null;
  folderName?: string | null;
  breadcrumbs?: { id: number; name: string }[];
  loading?: boolean;
  online: boolean;
  canContribute?: boolean;
  onGoHome?: () => void;
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
  onRecordView?: (doc: DocumentItem) => void;
  onSelectFolder?: (folderId: number | null) => void;
}

function BreadcrumbTrail({
  breadcrumbs,
  activeFolderId,
  onGoHome,
  onSelectFolder,
}: {
  breadcrumbs: { id: number; name: string }[];
  activeFolderId?: number | null;
  onGoHome?: () => void;
  onSelectFolder?: (folderId: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-500">
      <button
        type="button"
        onClick={() => (onGoHome ? onGoHome() : onSelectFolder?.(null))}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50"
      >
        <Home className="h-3.5 w-3.5" />
        All documents
      </button>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-gray-400" />
          <button
            type="button"
            onClick={() => onSelectFolder?.(crumb.id)}
            className={cn(
              'max-w-[10rem] truncate rounded-md px-1.5 py-0.5 font-medium',
              activeFolderId === crumb.id ? 'bg-indigo-50 text-indigo-700' : 'text-indigo-600 hover:bg-indigo-50',
            )}
            title={crumb.name}
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </div>
  );
}

export function DocumentDetailPane({
  document,
  folder,
  folderName,
  breadcrumbs = [],
  loading = false,
  online,
  canContribute = true,
  onGoHome,
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
  onRecordView,
  onSelectFolder,
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
      <div className="flex h-full items-center justify-center bg-white text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!document) {
    const visibilityLabel = folder?.effective_visibility ?? folder?.visibility;
    const accessLabel = visibilityLabel ? ACCESS_VISIBILITY_LABEL[visibilityLabel] : null;

    return (
      <div className="flex h-full min-h-0 flex-col bg-transparent">
        <BreadcrumbTrail
          breadcrumbs={breadcrumbs}
          activeFolderId={folder?.id ?? null}
          onGoHome={onGoHome}
          onSelectFolder={onSelectFolder}
        />
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className={cn('w-full max-w-lg p-8', DOCUMENT_SURFACE.panel)}>
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

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
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
                <div className="grid gap-2 sm:grid-cols-2">
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-white/80 backdrop-blur-md">
      <BreadcrumbTrail
        breadcrumbs={breadcrumbs}
        activeFolderId={document.folder_id}
        onGoHome={onGoHome}
        onSelectFolder={onSelectFolder}
      />

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
        <DocumentPreviewContent document={document} className="min-h-[420px]" />
        <div className={cn('mt-4 px-4 py-3', DOCUMENT_SURFACE.panel)}>
          <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />
          <DocumentTagChips tags={document.tags} className="mt-3" />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>{formatDocumentBytes(document.file_size)}</span>
            {document.mime_type && <span>{document.mime_type}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
