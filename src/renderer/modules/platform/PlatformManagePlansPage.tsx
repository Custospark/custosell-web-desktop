import { useMemo, useState } from 'react';
import { usePlans, useDeletePlan } from './api/PlanQueries';
import { PlanFormDrawer } from './components/PlanFormDrawer';
import type { Plan } from '../../shared/types';
import { Button } from '../../shared/components/buttons/Button';
import { SearchInput } from '../../shared/components/inputs/SearchInput';
import { Table } from '../../shared/components/tables/Table';
import { Card } from '../../shared/components/cards/Card';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../shared/components/cards/EmptyState';
import { useConfirm } from '../../shared/components/Feedback/ConfirmContext';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { CreditCard, Plus, Pencil, Trash2, Check } from 'lucide-react';

export default function PlatformManagePlansPage() {
  const { data: plans = [], isLoading, error } = usePlans();
  const deleteMutation = useDeletePlan();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter((p) =>
      p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [plans, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingPlan(null); setDrawerOpen(true); };
  const openEdit = (p: Plan) => { setEditingPlan(p); setDrawerOpen(true); };

  const handleDelete = async (p: Plan) => {
    const confirmed = await confirm({
      title: 'Delete plan',
      message: `Delete "${p.name}"? This cannot be undone. Businesses on this plan may be affected.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(p.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState
        icon={<CreditCard className="w-12 h-12" />}
        title="Failed to load plans"
        description={error.message || 'An error occurred'}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      <PlanFormDrawer key={editingPlan?.id ?? 'create'} open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={editingPlan} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage subscription plans, pricing, features, and limits</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add plan</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search plans by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
        </div>

        <Table<Plan>
          rowKey={(p) => p.id}
          columns={[
            { key: 'name', header: 'Plan', render: (p) => (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{p.name}</span>
                {p.is_popular && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Popular
                  </span>
                )}
                {!p.is_active && (
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
            )},
            { key: 'slug', header: 'Slug', render: (p) => (
              <span className="text-sm text-gray-500 font-mono">{p.slug}</span>
            )},
            { key: 'price_monthly', header: 'Monthly', render: (p) => (
              <span className="text-sm font-medium text-gray-900">
                {Number(p.price_monthly).toLocaleString('en-UG')} UGX
              </span>
            )},
            { key: 'trial_days', header: 'Trial', render: (p) => (
              <span className="text-sm text-gray-600">{p.trial_days ?? '-'} days</span>
            )},
            { key: 'actions', header: '', render: (p) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit plan">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} disabled={deleteMutation.isPending} title="Delete plan">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            )},
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
    </>
  );
}
