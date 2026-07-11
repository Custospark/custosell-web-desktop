import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Wrench } from 'lucide-react';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import {
  useHrCompanyAsset,
  useHrCompanyAssetAssignments,
  useHrCompanyAssetMaintenanceExpenses,
} from '../api/useHrCompanyAssetsQueries';
import { HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

function personName(p?: { first_name: string; last_name: string } | null) {
  return p ? `${p.first_name} ${p.last_name}` : '—';
}

export default function HrCompanyAssetDetailPage() {
  const { assetId } = useParams();
  const id = Number(assetId);
  const { data: asset, isLoading, isError } = useHrCompanyAsset(id);
  const { data: assignments = [], isLoading: loadingHistory } = useHrCompanyAssetAssignments(id);
  const { data: expenses = [], isLoading: loadingExpenses } = useHrCompanyAssetMaintenanceExpenses(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="space-y-4">
        <Link to={ROUTES.HR.COMPANY_ASSETS} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to company assets
        </Link>
        <p className="text-sm text-gray-500">Asset not found or could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to={ROUTES.HR.COMPANY_ASSETS} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to company assets
      </Link>

      <HrPageHeader
        icon={Package}
        title={asset.name}
        description={[
          asset.asset_tag ? `Tag ${asset.asset_tag}` : null,
          asset.category ? asset.category : null,
          asset.condition ? `Condition: ${asset.condition}` : null,
        ].filter(Boolean).join(' · ') || 'Company asset detail'}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={cn(HR_SURFACE.panel, 'p-4')}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assignee</p>
          {asset.assigned_employee_id && asset.assigned_employee ? (
            <Link to={ROUTES.HR.EMPLOYEE(asset.assigned_employee_id)} className="mt-1 block text-sm font-medium text-indigo-600 hover:underline">
              {personName(asset.assigned_employee)}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Unassigned</p>
          )}
        </div>
        <div className={cn(HR_SURFACE.panel, 'p-4')}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Serial / Location</p>
          <p className="mt-1 text-sm text-gray-800">{asset.serial_number || '—'} · {asset.location || '—'}</p>
        </div>
        <div className={cn(HR_SURFACE.panel, 'p-4')}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Book status</p>
          <p className="mt-1 text-sm capitalize text-gray-800">{asset.status.replace('_', ' ')}</p>
          <p className="text-xs text-gray-500">Cost {asset.cost.toLocaleString()} · Book {asset.book_value.toLocaleString()}</p>
        </div>
      </div>

      <HrSectionCard title="Assignment history" description="Assign, transfer, and return events for this asset.">
        {loadingHistory ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No custody events yet.</p>
        ) : (
          <div className={HR_SURFACE.tableWrap}>
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">From</th>
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 text-gray-600">{new Date(row.occurred_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 capitalize">{row.action}</td>
                    <td className="px-4 py-2.5">{personName(row.from_employee)}</td>
                    <td className="px-4 py-2.5">{personName(row.to_employee)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{row.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HrSectionCard>

      <HrSectionCard
        title="Maintenance expenses"
        description="Expenses linked to this asset (repairs and upkeep)."
        actions={<Wrench className="h-4 w-4 text-gray-400" />}
      >
        {loadingExpenses ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-gray-500">No linked maintenance expenses.</p>
        ) : (
          <ul className="space-y-2">
            {expenses.map((exp) => (
              <li key={exp.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{exp.description}</p>
                  <p className="text-xs text-gray-500">{exp.expense_date}</p>
                </div>
                <span className="font-medium text-gray-800">{Number(exp.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </HrSectionCard>
    </div>
  );
}
