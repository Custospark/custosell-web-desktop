import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Button } from '../../shared/components/buttons/Button';
import { useInvoice } from './api/InvoiceQueries';
import InvoiceBuilderForm from './InvoiceBuilderForm';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface EditInvoiceDraftPanelProps {
  invoiceId: number;
  onSaved: () => void;
  onCancel: () => void;
}

export default function EditInvoiceDraftPanel({ invoiceId, onSaved, onCancel }: EditInvoiceDraftPanelProps) {
  const { data: invoice, isLoading, isError } = useInvoice(invoiceId);

  if (isLoading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (isError || !invoice) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-800">Could not load invoice</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onCancel}>
          Back to list
        </Button>
      </div>
    );
  }

  if (invoice.status !== 'draft') {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-800">Only draft invoices can be edited</p>
        <p className="text-sm text-gray-500 mt-1">This invoice is already {invoice.status.replace('_', ' ')}.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onCancel}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to invoice list
      </button>
      <InvoiceBuilderForm mode="edit" invoice={invoice} onComplete={onSaved} onCancel={onCancel} />
    </div>
  );
}
