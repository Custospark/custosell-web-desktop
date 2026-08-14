import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineLeads } from '../api/usePipelineQueries';
import LeadDetailModal from '../ui/LeadDetailModal';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';

export default function MyWorkPage() {
  const { data: leads, isLoading } = usePipelineLeads({ assigned_to: 'me', status: 'open' });
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...(leads ?? [])].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()),
    [leads],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <CustosellLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{sorted.length} open lead{sorted.length === 1 ? '' : 's'} assigned to you</p>

      {sorted.length === 0 ? (
        <Card className="py-12 text-center text-sm text-gray-500">No open leads assigned to you right now.</Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Board</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelectedLeadId(lead.id)} className="font-medium text-blue-700 hover:underline">
                      {lead.title}
                    </button>
                    {lead.contact_name && <p className="text-xs text-gray-500">{lead.contact_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {lead.board && (
                      <Link to={ROUTES.PIPELINE.BOARD(lead.board.code ?? lead.board.id)} className="text-gray-700 hover:text-blue-700">
                        {lead.board.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">{lead.stage?.name}</td>
                  <td className="px-4 py-3">
                    {lead.estimated_value != null ? formatCurrency(lead.estimated_value, lead.currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.updated_at ? formatShiftDate(lead.updated_at) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLeadId != null && (
        <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}
