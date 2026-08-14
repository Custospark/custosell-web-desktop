import { Card } from '../../../shared/components/cards/Card';
import type { Estimate } from '../api/estimateTypes';
import { FileText } from 'lucide-react';

export default function EstimateNotesTab({ estimate }: { estimate: Estimate }) {
  const hasAny = Boolean(estimate.notes || estimate.terms || estimate.internal_notes);
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <FileText className="h-4 w-4 text-blue-600" />
        Notes & terms
      </div>
      {hasAny ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {estimate.notes && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer notes</h4>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{estimate.notes}</p>
            </div>
          )}
          {estimate.terms && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Terms & conditions</h4>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{estimate.terms}</p>
            </div>
          )}
          {estimate.internal_notes && (
            <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600">Internal notes</h4>
              <p className="mt-2 text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{estimate.internal_notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No notes or terms added.</p>
        </div>
      )}
    </Card>
  );
}
