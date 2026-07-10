import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, LayoutGrid, Search } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useDocumentCabinets } from '../api/useDocumentCabinetQueries';
import CabinetListCard from './CabinetListCard';
import { cn } from '../../../shared/utils/cn';

interface AllCabinetsPickerModalProps {
  open: boolean;
  onClose: () => void;
  activeCabinetId: number;
  onCreateNew?: () => void;
}

function filterCabinets(
  cabinets: ReturnType<typeof useDocumentCabinets>['data'],
  query: string,
) {
  const list = cabinets?.data ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (cabinet) =>
      cabinet.name.toLowerCase().includes(q)
      || (cabinet.description?.toLowerCase().includes(q) ?? false),
  );
}

export default function AllCabinetsPickerModal({
  open,
  onClose,
  activeCabinetId,
  onCreateNew,
}: AllCabinetsPickerModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: cabinetsPage, isLoading } = useDocumentCabinets(undefined, open);
  const filtered = useMemo(() => filterCabinets(cabinetsPage, search), [cabinetsPage, search]);

  const handleSelect = (id: number) => {
    onClose();
    navigate(ROUTES.DOCUMENTS.CABINET(id));
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Switch cabinet" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cabinets…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <Archive className="h-4 w-4" />
              New cabinet
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(ROUTES.DOCUMENTS.INDEX);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LayoutGrid className="h-4 w-4" />
            All cabinets
          </button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading cabinets…</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No cabinets match your search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cabinet) => (
              <CabinetListCard
                key={cabinet.id}
                cabinet={cabinet}
                variant="compact"
                showVisibility
                isActive={cabinet.id === activeCabinetId}
                onSelect={() => handleSelect(cabinet.id)}
              />
            ))}
          </div>
        )}

        <p className={cn('text-xs text-gray-500')}>
          {filtered.length} cabinet{filtered.length === 1 ? '' : 's'}
          {search.trim() ? ' matching search' : ''}
        </p>
      </div>
    </Modal>
  );
}
