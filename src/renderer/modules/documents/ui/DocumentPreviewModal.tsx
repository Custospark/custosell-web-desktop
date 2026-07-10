import { useEffect } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Download, ExternalLink } from 'lucide-react';
import type { DocumentItem } from '../api/documentTypes';
import { isImageDocument, isPdfDocument } from '../api/documentTransferUtils';
import { DocumentUserAttribution } from './DocumentUserAttribution';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  open: boolean;
  onClose: () => void;
  onDownload?: (doc: DocumentItem) => void;
  onRecordView?: (doc: DocumentItem) => void;
}

export function DocumentPreviewModal({
  document,
  open,
  onClose,
  onDownload,
  onRecordView,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    if (open && document && onRecordView) {
      onRecordView(document);
    }
  }, [open, document, onRecordView]);

  if (!document) return null;

  const pdf = isPdfDocument(document);
  const image = isImageDocument(document);
  const previewUrl = document.file_url;

  return (
    <Modal open={open} onClose={onClose} title={document.title} size="xl">
      <div className="space-y-4">
        <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {pdf && previewUrl && (
            <iframe
              title={document.title}
              src={previewUrl}
              className="h-[min(70vh,640px)] w-full bg-white"
            />
          )}
          {image && previewUrl && (
            <div className="flex max-h-[min(70vh,640px)] items-center justify-center p-4">
              <img src={previewUrl} alt={document.title} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          {!pdf && !image && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Preview is not available for this file type.
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {document.url && (
            <Button type="button" variant="secondary" onClick={() => window.open(document.url!, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="h-4 w-4" /> Open link
            </Button>
          )}
          {document.file_url && onDownload && (
            <Button type="button" onClick={() => onDownload(document)}>
              <Download className="h-4 w-4" /> Download
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
