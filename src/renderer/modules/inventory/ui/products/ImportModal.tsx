import { useState, useRef } from 'react';
import { Button } from '../../../../shared/components/buttons/Button';
import { Modal } from '../../../../shared/components/modals/Modal';
import { axiosInstance } from '../../../../app/api/axiosConfig';
import { useToast } from '../../../../app/contexts/useToast';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportResult {
  imported: number;
  errors: { row: number; errors: Record<string, string[]> }[];
  total_rows: number;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axiosInstance.post<ImportResult>('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.imported > 0) {
        showToast('success', `${data.imported} products imported successfully`);
        onImported();
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data } = await axiosInstance.get('/products/import-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product-import-template.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Failed to download template');
    }
  };

  const reset = () => { setFile(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <Modal isOpen={open} onClose={() => { reset(); onClose(); }} title="Import Products" size="md">
      {!result ? (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Upload an Excel file (.xlsx, .xls, or .csv) with your product data.
            <br />Max 5MB, up to 2000 rows.
          </p>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-1.5" />Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Click to select file'}
              </p>
              {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              <Upload className="w-4 h-4 mr-1.5" />Upload & Import
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg flex items-start gap-3 ${result.errors.length > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            {result.errors.length > 0 ? (
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-medium text-gray-900">{result.imported} of {result.total_rows} imported</p>
              {result.errors.length > 0 && (
                <p className="text-sm text-amber-700 mt-1">{result.errors.length} row(s) had errors</p>
              )}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {result.errors.map((e) => (
                <div key={e.row} className="p-3 bg-red-50 rounded-lg text-sm">
                  <p className="font-medium text-red-800 mb-1">Row {e.row}</p>
                  <ul className="list-disc list-inside text-red-600 text-xs space-y-0.5">
                    {Object.values(e.errors).flat().map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => { reset(); onClose(); }}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
