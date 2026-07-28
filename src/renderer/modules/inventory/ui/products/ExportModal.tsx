import { useState } from 'react';
import { Button } from '../../../../shared/components/buttons/Button';
import { Modal } from '../../../../shared/components/modals/Modal';
import { useToast } from '../../../../app/contexts/useToast';
import { API_BASE_URL } from '../../../../app/api/apiConfig';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/products/export${format === 'xlsx' ? '?format=xlsx' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `products-export.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast('success', `Products exported as ${format.toUpperCase()}`);
      onClose();
    } catch {
      showToast('error', 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Download Products" size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-500">Choose a format to export your product data.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormat('csv')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              format === 'csv'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <FileText className={`w-8 h-8 ${format === 'csv' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${format === 'csv' ? 'text-blue-700' : 'text-gray-600'}`}>CSV</span>
            <span className="text-xs text-gray-400">Comma-separated values</span>
          </button>
          <button
            type="button"
            onClick={() => setFormat('xlsx')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              format === 'xlsx'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <FileSpreadsheet className={`w-8 h-8 ${format === 'xlsx' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${format === 'xlsx' ? 'text-blue-700' : 'text-gray-600'}`}>Excel</span>
            <span className="text-xs text-gray-400">.xlsx spreadsheet</span>
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload} loading={downloading}>
            <Download className="w-4 h-4 mr-1.5" />Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}
