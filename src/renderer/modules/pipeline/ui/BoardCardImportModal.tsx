import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { useToast } from '../../../app/contexts/useToast';
import { PIPELINE } from '../../../shared/api/endpoints/endpoints';
import { pipelineKeys } from '../api/pipelineQueryKeys';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportResult {
  imported: number;
  errors: { row: number; errors: Record<string, string[]> }[];
  total_rows: number;
}

interface BoardCardImportModalProps {
  open: boolean;
  boardId: number;
  onClose: () => void;
  itemLabel?: string;
}

export default function BoardCardImportModal({
  open,
  boardId,
  onClose,
  itemLabel = 'card',
}: BoardCardImportModalProps) {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data } = await axiosInstance.get(PIPELINE.BOARD_IMPORT_TEMPLATE(boardId), {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'board-card-import-template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file || boardId <= 0) return;
    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post<ImportResult>(PIPELINE.BOARD_IMPORT(boardId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600_000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        },
      });
      setUploadProgress(100);
      setResult(data);
      if (data.imported > 0) {
        showToast('success', `${data.imported} ${itemLabel}${data.imported === 1 ? '' : 's'} imported`);
        void qc.invalidateQueries({ queryKey: pipelineKeys.kanban(boardId) });
        void qc.invalidateQueries({ queryKey: pipelineKeys.boards() });
      }
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { data?: { message?: string } } };
      const message = axiosErr.code === 'ECONNABORTED'
        ? 'Import timed out — try a smaller file'
        : axiosErr.response?.data?.message || 'Import failed';
      showToast('error', message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title={`Import ${itemLabel}s`} size="md">
      {!result ? (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Download the Excel template, fill in rows, then upload. Stage names must match columns on this board.
          </p>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-left transition-colors hover:bg-indigo-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Download template</p>
              <p className="text-xs text-indigo-700/80">board-card-import-template.xlsx</p>
            </div>
          </button>

          <div
            className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center transition-colors hover:border-indigo-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
          >
            <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="mb-3 text-sm text-gray-600">
              {file ? file.name : 'Drop an .xlsx / .xls / .csv file here, or browse'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (next) setFile(next);
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Browse files
            </Button>
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500">Uploading… {uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              loading={uploading}
              className="inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Imported {result.imported} of {result.total_rows} row{result.total_rows === 1 ? '' : 's'}
              </p>
              {result.errors.length > 0 && (
                <p className="mt-1 text-xs text-emerald-800">
                  {result.errors.length} row{result.errors.length === 1 ? '' : 's'} had errors and were skipped.
                </p>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/60 p-3">
              {result.errors.slice(0, 20).map((err) => (
                <div key={err.row} className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Row {err.row}:{' '}
                    {Object.values(err.errors).flat().join(' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={reset}>Import more</Button>
            <Button type="button" onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
