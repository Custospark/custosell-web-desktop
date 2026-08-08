import { useState } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import type { DocumentItem } from '../api/documentTypes';
import {
  isAudioDocument,
  isCsvDocument,
  isTextViewableDocument,
  isVideoDocument,
  isWordDocument,
  parseCsvRows,
} from '../api/documentFileViewUtils';
import { useDocumentContent, useUpdateDocumentContent } from '../api/useDocumentQueries';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pencil, Save, X } from 'lucide-react';

interface DocumentRichFileViewerProps {
  document: DocumentItem;
  className?: string;
  online?: boolean;
}

export function DocumentRichFileViewer({ document, className, online = true }: DocumentRichFileViewerProps) {
  const audio = isAudioDocument(document);
  const video = isVideoDocument(document);
  const textViewable = isTextViewableDocument(document);
  const previewUrl = document.file_url;

  if (audio && previewUrl) {
    return (
      <div className={cn('flex min-h-[200px] flex-col items-center justify-center gap-4 p-8', className)}>
        <audio controls preload="metadata" className="w-full max-w-xl" src={previewUrl}>
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  if (video && previewUrl) {
    return (
      <div className={cn('flex min-h-[280px] items-center justify-center bg-black p-2', className)}>
        <video controls preload="metadata" className="max-h-[70vh] w-full max-w-full" src={previewUrl}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (textViewable) {
    return <DocumentTextContentViewer key={document.id} document={document} className={className} online={online} />;
  }

  return null;
}

interface DocumentTextContentViewerProps {
  document: DocumentItem;
  className?: string;
  online?: boolean;
}

function DocumentTextContentViewer({ document, className, online = true }: DocumentTextContentViewerProps) {
  const { data, isLoading, isError, error, refetch } = useDocumentContent(document.id, true);
  const saveContent = useUpdateDocumentContent();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (isLoading) {
    return (
      <div className={cn('flex min-h-[240px] items-center justify-center', className)}>
        <CustosellLoader />
      </div>
    );
  }

  if (isError || !data) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Could not load file content.';
    return (
      <div className={cn('flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
        <p className="text-sm text-gray-600">{message}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  const csv = data.content_type === 'csv' || isCsvDocument(document);
  const word = data.content_type === 'word' || isWordDocument(document);
  const canEdit = data.editable && online && !word;

  const handleSave = async () => {
    await saveContent.mutateAsync({ id: document.id, content: draft });
    setEditing(false);
  };

  return (
    <div className={cn('flex min-h-[320px] flex-col', className)}>
      {(canEdit || data.truncated || word) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <div className="text-xs text-gray-500">
            {data.truncated && 'Preview truncated — download for the full file.'}
            {word && 'Word document — text preview (read-only).'}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saveContent.isPending}
                    onClick={() => {
                      setDraft(data.content);
                      setEditing(false);
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveContent.isPending}
                    onClick={() => void handleSave()}
                  >
                    <Save className="h-3.5 w-3.5" /> {saveContent.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => {
                  setDraft(data.content);
                  setEditing(true);
                }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="min-h-[360px] flex-1 resize-y border-0 bg-gray-950 p-4 font-mono text-sm leading-relaxed text-gray-100 outline-none focus:ring-0"
        />
      ) : csv ? (
        <DocumentCsvTable content={data.content} />
      ) : (
        <pre className="max-h-[70vh] flex-1 overflow-auto whitespace-pre-wrap break-words bg-gray-950 p-4 font-mono text-sm leading-relaxed text-gray-100">
          {data.content}
        </pre>
      )}
    </div>
  );
}

function DocumentCsvTable({ content }: { content: string }) {
  const rows = parseCsvRows(content);
  if (!rows.length) {
    return <p className="p-6 text-sm text-gray-500">Empty CSV file.</p>;
  }

  const [header, ...body] = rows;
  const colCount = Math.max(...rows.map((row) => row.length), 1);

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-gray-100">
          <tr>
            {Array.from({ length: colCount }, (_, i) => (
              <th key={i} className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                {header?.[i] ?? `Column ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
              {Array.from({ length: colCount }, (_, colIndex) => (
                <td key={colIndex} className="border border-gray-200 px-3 py-2 text-gray-800">
                  {row[colIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
