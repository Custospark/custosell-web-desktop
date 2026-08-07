import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Link, Trash2, File } from 'lucide-react';
import {
  useUploadExpenseAttachment,
  useCreateExpenseAttachmentLink,
  useDeleteExpenseAttachment,
} from '../api/ExpenseAttachmentQueries';
import { formatFileSize } from '../../../shared/utils/formatFileSize';
import type { ExpenseAttachment } from '../api/ExpenseTypes';

function AttachmentList({ expenseId, attachments }: { expenseId: number; attachments?: ExpenseAttachment[] }) {
  const deleteAtt = useDeleteExpenseAttachment(expenseId);

  if (!attachments?.length) return null;

  return (
    <div className="space-y-1.5">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {att.type === 'link' ? (
              <Link className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <a
              href={att.type === 'link' ? att.link_url! : att.file_url!}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate"
            >
              {att.file_name}
            </a>
            {att.file_size && (
              <span className="text-xs text-gray-400 hidden sm:inline">{formatFileSize(att.file_size)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => deleteAtt.mutate(att.id)}
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export interface ExpenseAttachmentsHandle {
  flush: (expenseId: number) => Promise<void>;
  hasQueued: () => boolean;
}

interface ExpenseAttachmentsProps {
  expenseId: number | null;
  attachments?: ExpenseAttachment[];
  onUploadingChange?: (uploading: boolean) => void;
}

const ExpenseAttachments = forwardRef<ExpenseAttachmentsHandle, ExpenseAttachmentsProps>(
  function ExpenseAttachments({ expenseId, attachments, onUploadingChange }, ref) {
    const [fileUploading, setFileUploading] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingLink, setPendingLink] = useState<{ url: string; title: string } | null>(null);

    const uploadAtt = useUploadExpenseAttachment();
    const createLinkAtt = useCreateExpenseAttachmentLink();

    const hasPendingLink = pendingLink !== null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setPendingFile(file);
    };

    const handleQueueLink = () => {
      if (!linkUrl.trim()) return;
      setPendingLink({ url: linkUrl.trim(), title: linkTitle.trim() });
      setLinkUrl('');
      setLinkTitle('');
    };

    const handleRemovePendingLink = () => {
      setPendingLink(null);
    };

    useImperativeHandle(ref, () => ({
      async flush(id: number) {
        if (pendingFile) {
          setFileUploading(true);
          onUploadingChange?.(true);
          try {
            await uploadAtt.mutateAsync({ expenseId: id, file: pendingFile });
            setPendingFile(null);
          } finally {
            setFileUploading(false);
            onUploadingChange?.(false);
          }
        }
        if (pendingLink) {
          await createLinkAtt.mutateAsync({ expenseId: id, url: pendingLink.url, title: pendingLink.title || undefined });
          setPendingLink(null);
        }
      },
      hasQueued() {
        return pendingFile !== null || pendingLink !== null;
      },
    }), [pendingFile, pendingLink, uploadAtt, createLinkAtt, onUploadingChange]);

    return (
      <div>
        <div>
          <p className="text-xs text-gray-400 mb-3">Upload receipts or invoices — or add a reference link.</p>
          {expenseId !== null && <AttachmentList expenseId={expenseId} attachments={attachments} />}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            disabled={fileUploading || !!pendingFile}
            className="flex-1 text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-40"
          />
          {pendingFile && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <File className="w-3.5 h-3.5" />
              {pendingFile.name}
            </span>
          )}
        </div>
        <div className="flex items-start gap-2 mt-3">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Link label (optional)"
              disabled={hasPendingLink}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40"
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
                disabled={hasPendingLink}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40"
              />
              {hasPendingLink ? (
                <button
                  type="button"
                  onClick={handleRemovePendingLink}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQueueLink}
                  disabled={!linkUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-40"
                >
                  <Link className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ExpenseAttachments;