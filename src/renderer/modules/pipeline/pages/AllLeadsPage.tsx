import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { usePipelineBoards, usePipelineLeads } from '../api/usePipelineQueries';
import LeadDetailDrawer from '../ui/LeadDetailDrawer';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';

export default function AllLeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [boardId, setBoardId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search.trim()) f.search = search.trim();
    if (status) f.status = status;
    if (boardId) f.board_id = boardId;
    return f;
  }, [search, status, boardId]);

  const { data: boards } = usePipelineBoards();
  const { data: leads, isLoading } = usePipelineLeads(filters);

  const sorted = useMemo(
    () => [...(leads ?? [])].sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()),
    [leads],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="converted">Converted</option>
        </select>
        <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All boards</option>
          {(boards ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Board</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
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
                  </td>
                  <td className="px-4 py-3">
                    {lead.board && (
                      <Link to={ROUTES.PIPELINE.BOARD(lead.board.id)} className="text-gray-700 hover:text-blue-700">
                        {lead.board.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">{lead.stage?.name}</td>
                  <td className="px-4 py-3 capitalize">{lead.status}</td>
                  <td className="px-4 py-3">{lead.assignee?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {lead.estimated_value != null ? formatCurrency(lead.estimated_value, lead.currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.updated_at ? formatShiftDate(lead.updated_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">No leads match your filters.</p>
          )}
        </div>
      )}

      {selectedLeadId != null && (
        <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}
