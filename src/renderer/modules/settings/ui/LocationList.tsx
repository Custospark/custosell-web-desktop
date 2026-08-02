import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocations, useDeleteLocation, useSetDefaultLocation } from '../api/settings/LocationQueries';
import type { Location } from '../api/settings/LocationTypes';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchInput } from '../../../shared/components/inputs/SearchInput';
import { Table } from '../../../shared/components/tables/Table';
import { Card } from '../../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useToast } from '../../../app/contexts/useToast';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import LocationFormModal from './LocationFormModal';
import { GitBranch, Plus, Pencil, Star, Trash2, Users } from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';

export default function LocationList() {
  const { data: locations, isLoading, error } = useLocations();
  const deleteMutation = useDeleteLocation();
  const setDefaultMutation = useSetDefaultLocation();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const filtered = useMemo(() => {
    const safeLocations = (locations ?? []).filter(Boolean);
    if (!search.trim()) return safeLocations;
    const q = search.toLowerCase();
    return safeLocations.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.code && l.code.toLowerCase().includes(q)) ||
      (l.city && l.city.toLowerCase().includes(q)),
    );
  }, [locations, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingLocation(null); setModalOpen(true); };
  const openEdit = (l: Location) => { setEditingLocation(l); setModalOpen(true); };

  const handleSetDefault = async (l: Location) => {
    if (l.is_default) return;
    const confirmed = await confirm({
      title: 'Set default branch',
      message: `Make "${l.name}" the default branch? New sales, stock, and shifts will use it.`,
      confirmText: 'Set default',
    });
    if (confirmed) setDefaultMutation.mutate(l.id);
  };

  const handleDelete = async (l: Location) => {
    if (l.is_default) {
      showToast('error', 'The default branch cannot be deleted. Set another branch as default first.');
      return;
    }
    const confirmed = await confirm({
      title: 'Delete branch',
      message: `Delete "${l.name}"? Its sales, shifts, and stock history will move to the default branch.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(l.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<GitBranch className="w-12 h-12" />} title="Failed to load branches"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Branch Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track stock, sales, and shifts per branch</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.SETTINGS.STAFF}>
            <Button><Users className="w-4 h-4 mr-1.5" />Add Staff</Button>
          </Link>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Branch</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput placeholder="Search branches by name, code or city..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        </div>
        <Table<Location>
          rowKey={(l) => l.id}
          columns={[
            { key: 'index', header: '#', render: (_item, idx) => (paginated.page - 1) * paginated.pageSize + idx + 1 },
            { key: 'name', header: 'Branch', render: (item) => (
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{item.name}</span>
                  {item.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Default branch">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                  {!item.is_active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>
              ),
            },
            { key: 'code', header: 'Code', render: (item) => item.code || <span className="text-gray-400">—</span> },
            { key: 'location', header: 'Location', render: (item) => {
                const place = [item.city, item.state, item.country].filter(Boolean).join(', ');
                return place || <span className="text-gray-400">—</span>;
              } },
            { key: 'phone', header: 'Phone', render: (item) => item.phone || <span className="text-gray-400">—</span> },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  {!item.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleSetDefault(item); }}
                      title="Set as default"
                      disabled={setDefaultMutation.isPending}
                    >
                      <Star className="w-4 h-4 text-amber-500" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                    title={item.is_default ? 'Default branch cannot be deleted' : 'Delete'}
                    disabled={item.is_default || deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={paginated.data}
        />
        <Pagination
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          totalItems={paginated.totalItems}
          pageSize={paginated.pageSize}
          onPageChange={paginated.setPage}
          onPageSizeChange={paginated.setPageSize}
        />
      </Card>

      <LocationFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLocation(null);
        }}
        location={editingLocation}
      />
    </>
  );
}
