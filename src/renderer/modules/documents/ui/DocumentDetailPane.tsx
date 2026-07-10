import { useEffect, useRef } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentItem } from '../api/documentTypes';
import { documentPrimaryLabel } from '../api/documentDisplayUtils';
import { formatDocumentBytes, isImageDocument, isPdfDocument } from '../api/documentTransferUtils';
import { DocumentItemIcon } from './documentFileIcons';
import { DocumentUserAttribution } from './DocumentUserAttribution';
import {
  Download,
  ExternalLink,
  FolderInput,
  Pencil,
  Trash2,
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
    <div className={cn('overflow-hidden rounded-lg border border-gray-200 bg-gray-50', className)}>
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
  folderName?: string | null;
  breadcrumbs?: { id: number; name: string }[];
  loading?: boolean;
  online: boolean;
  onDownload?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onMove?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  onRecordView?: (doc: DocumentItem) => void;
  onSelectFolder?: (folderId: number) => void;
}

export function DocumentDetailPane({
  document,
  folderName,
  breadcrumbs = [],
  loading = false,
  online,
  onDownload,
  onRename,
  onMove,
  onDelete,
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
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#fafafa] px-8 text-center">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-10 py-14 shadow-sm">
          <p className="text-base font-medium text-gray-800">
            {folderName ? folderName : 'Select a file to preview'}
          </p>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            {folderName
              ? 'Choose a file from the explorer on the left, or upload a new one with the toolbar icons.'
              : 'Browse folders and files in the explorer. Click any file to open it here.'}
          </p>
          {breadcrumbs.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1 text-xs text-gray-500">
              {breadcrumbs.map((crumb) => (
                <button
                  key={crumb.id}
                  type="button"
                  className="rounded-md bg-gray-100 px-2 py-1 hover:bg-gray-200"
                  onClick={() => onSelectFolder?.(crumb.id)}
                >
                  {crumb.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const label = documentPrimaryLabel(document);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-[#f8f8f8] px-4 py-2">
        <DocumentItemIcon doc={document} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900" title={label}>{label}</p>
          {document.file_name && document.file_name !== document.title && (
            <p className="truncate text-xs text-gray-500" title={document.file_name}>{document.file_name}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {document.url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => window.open(document.url!, '_blank', 'noopener,noreferrer')} title="Open link">
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {document.file_url && onDownload && (
            <Button type="button" variant="ghost" size="sm" disabled={!online} onClick={() => onDownload(document)} title="Download">
              <Download className="h-4 w-4" />
            </Button>
          )}
          {(document.can_edit || document.can_manage) && onRename && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onRename(document)} title="Rename">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {(document.can_edit || document.can_manage) && onMove && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onMove(document)} title="Move">
              <FolderInput className="h-4 w-4" />
            </Button>
          )}
          {document.can_delete && onDelete && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(document)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <DocumentPreviewContent document={document} className="min-h-[420px]" />
        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>{formatDocumentBytes(document.file_size)}</span>
            {document.mime_type && <span>{document.mime_type}</span>}
            {document.tags?.map((tag) => (
              <span key={tag.id} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-200">#{tag.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
