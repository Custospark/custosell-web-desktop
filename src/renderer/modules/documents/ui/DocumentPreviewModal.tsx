import { useEffect } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Download, ExternalLink } from 'lucide-react';
import type { DocumentItem } from '../api/documentTypes';
import {
  canInlineViewDocument,
} from '../api/documentFileViewUtils';
import { DocumentPreviewContent } from './DocumentDetailPane';
import { DocumentUserAttribution } from './DocumentUserAttribution';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  open: boolean;
  onClose: () => void;
  onDownload?: (doc: DocumentItem) => void;
  onRecordView?: (doc: DocumentItem) => void;
  online?: boolean;
}

export function DocumentPreviewModal({
  document,
  open,
  onClose,
  onDownload,
  onRecordView,
  online = true,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    if (open && document && onRecordView) {
      onRecordView(document);
    }
  }, [open, document, onRecordView]);

  if (!document) return null;

  const canPreview = canInlineViewDocument(document);

  return (
    <Modal isOpen={open} onClose={onClose} title={document.title} size="xl">
      <div className="space-y-4">
        <DocumentUserAttribution user={document.uploader} timestamp={document.updated_at ?? document.created_at} />

        {canPreview ? (
          <DocumentPreviewContent document={document} className="min-h-[min(70vh,640px)]" online={online} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
            Preview is not available for this file type.
          </div>
        )}

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
