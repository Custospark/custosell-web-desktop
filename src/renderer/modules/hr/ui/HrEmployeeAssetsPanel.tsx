import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useHrCompanyAssets } from '../api/useHrCompanyAssetsQueries';
import { HrEmptyState, HrSectionCard } from './HrSurface';
import { HR_SURFACE } from './hrSurfaceStyles';

function assigneeLabel(asset: {
  assigned_employee?: { first_name: string; last_name: string } | null;
}) {
  const e = asset.assigned_employee;
  return e ? `${e.first_name} ${e.last_name}` : null;
}

export function HrEmployeeAssetsPanel({ employeeId }: { employeeId: number }) {
  const { data: assets = [], isLoading } = useHrCompanyAssets({
    assigned_employee_id: String(employeeId),
  });

  return (
    <HrSectionCard
      title="Assets issued"
      description="Company equipment currently assigned to this person."
      actions={
        <Link to={ROUTES.HR.COMPANY_ASSETS} className="text-sm text-indigo-600 hover:underline">
          Manage assets
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <CustosellLoader />
        </div>
      ) : assets.length === 0 ? (
        <HrEmptyState
          icon={<Package className="h-5 w-5" />}
          title="No assets issued"
          description="Assign a laptop, phone, or other company asset from Company Assets."
        />
      ) : (
        <div className={HR_SURFACE.tableWrap}>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-white/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Asset</th>
                <th className="px-4 py-2">Tag</th>
                <th className="px-4 py-2">Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-indigo-50/40">
                  <td className="px-4 py-2.5">
                    <Link
                      to={ROUTES.HR.COMPANY_ASSET(asset.id)}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {asset.name}
                    </Link>
                    {assigneeLabel(asset) ? (
                      <p className="text-xs text-gray-400">{asset.category ?? '—'}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{asset.asset_tag ?? '—'}</td>
                  <td className="px-4 py-2.5 capitalize text-gray-600">{asset.condition ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrSectionCard>
  );
}
