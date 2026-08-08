import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Package, Pencil, Plus, Search, Undo2, UserPlus } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import type { FixedAsset } from '../../accounting/api/AccountingTypes';
import { useHrCompanyAssets } from '../api/useHrCompanyAssetsQueries';
import { HrEmptyState, HrPageHeader } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';
import { AddCompanyAssetModal, CATEGORIES, CustodyAssetModal, EditCompanyAssetModal } from '../ui/HrCompanyAssetModals';

type CustodyAction = 'assign' | 'transfer' | 'return';

function assigneeName(asset: FixedAsset) {
  const e = asset.assigned_employee;
  if (!e) return null;
  return `${e.first_name} ${e.last_name}`;
}

export default function HrCompanyAssetsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [custody, setCustody] = useState<{ asset: FixedAsset; action: CustodyAction } | null>(null);

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    category: category || undefined,
    unassigned: unassignedOnly ? '1' : undefined,
    per_page: 500,
  }), [search, category, unassignedOnly]);

  const { data: assets = [], isLoading } = useHrCompanyAssets(filters);
  const paginated = usePagination(assets, 15);

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Package}
        title="Company Assets"
        description="Track laptops, phones, and other equipment — who holds them, and their condition."
        actions={
          <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add asset
          </Button>
        }
      />

      <div className={HR_SURFACE.toolbar}>
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, tag, or serial…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
          Unassigned only
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><CustosellLoader /></div>
      ) : assets.length === 0 ? (
        <HrEmptyState
          icon={<Package className="h-6 w-6" />}
          title={search || category || unassignedOnly ? 'No assets match' : 'No company assets yet'}
          description={search || category || unassignedOnly ? 'Try clearing filters.' : 'Add your first laptop, phone, or furniture item.'}
          action={!search && !category && !unassignedOnly ? (
            <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add asset
            </Button>
          ) : undefined}
        />
      ) : (
        <div className={HR_SURFACE.tableWrap}>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.data.map((asset) => {
                const name = assigneeName(asset);
                return (
                  <tr key={asset.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.HR.COMPANY_ASSET(asset.id)} className="font-medium text-indigo-600 hover:underline">
                        {asset.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{asset.asset_tag ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{asset.category ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{asset.condition ?? '—'}</td>
                    <td className="px-4 py-3">
                      {asset.assigned_employee_id && name ? (
                        <Link to={ROUTES.HR.EMPLOYEE(asset.assigned_employee_id)} className="text-indigo-600 hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        asset.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
                      )}>
                        {asset.status ? asset.status.replace('_', ' ') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(asset)} className="inline-flex items-center gap-1">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {!asset.assigned_employee_id ? (
                          <Button size="sm" variant="outline" onClick={() => setCustody({ asset, action: 'assign' })} className="inline-flex items-center gap-1">
                            <UserPlus className="h-3.5 w-3.5" /> Assign
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setCustody({ asset, action: 'transfer' })} className="inline-flex items-center gap-1">
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCustody({ asset, action: 'return' })} className="inline-flex items-center gap-1">
                              <Undo2 className="h-3.5 w-3.5" /> Return
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </div>
        </div>
      )}

      <AddCompanyAssetModal open={addOpen} onClose={() => setAddOpen(false)} />
      {editing ? (
        <EditCompanyAssetModal key={editing.id} asset={editing} onClose={() => setEditing(null)} />
      ) : null}
      <CustodyAssetModal
        asset={custody?.asset ?? null}
        action={custody?.action ?? null}
        onClose={() => setCustody(null)}
      />
    </div>
  );
}
