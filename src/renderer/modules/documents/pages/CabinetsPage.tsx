import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useDocumentCabinets } from '../api/useDocumentCabinetQueries';
import CreateCabinetModal from '../ui/CreateCabinetModal';
import CabinetListCard from '../ui/CabinetListCard';
import DocumentsWalkthrough from '../ui/DocumentsWalkthrough';
import { Plus, Search } from 'lucide-react';

export default function CabinetsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: cabinetsPage, isLoading, isFetched } = useDocumentCabinets();

  const cabinets = useMemo(() => cabinetsPage?.data ?? [], [cabinetsPage?.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cabinets;
    return cabinets.filter(
      (cabinet) =>
        cabinet.name.toLowerCase().includes(q)
        || (cabinet.description?.toLowerCase().includes(q) ?? false),
    );
  }, [cabinets, search]);

  if (isLoading || !isFetched) {
    return (
      <div className="space-y-4 pb-8">
        <LoadingSkeleton variant="card" className="p-0" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <DocumentsWalkthrough />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cabinets…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New cabinet
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        {filtered.length} cabinet{filtered.length === 1 ? '' : 's'}
        {search.trim() ? ' matching search' : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cabinet) => (
          <CabinetListCard
            key={cabinet.id}
            cabinet={cabinet}
            to={ROUTES.DOCUMENTS.CABINET(cabinet.id)}
            showVisibility
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="py-12 text-center text-sm text-gray-500">
          {search.trim()
            ? 'No cabinets match your search. Try a different term or create a new cabinet.'
            : 'No cabinets yet. Create your first cabinet to organize your files.'}
        </Card>
      )}

      <CreateCabinetModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
