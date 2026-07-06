import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { FileSpreadsheet, FolderKanban, TrendingUp, LayoutTemplate } from 'lucide-react';

const tabs = [
  { to: ROUTES.ESTIMATES.INDEX, label: 'Estimates', icon: FileSpreadsheet, exact: true },
  { to: ROUTES.ESTIMATES.PROJECTS, label: 'Projects', icon: FolderKanban },
  { to: ROUTES.ESTIMATES.INSIGHTS, label: 'Insights', icon: TrendingUp },
  { to: ROUTES.ESTIMATES.TEMPLATES, label: 'Templates', icon: LayoutTemplate },
];

export default function EstimatesLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Estimates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Build proposals with cost and margin, send for approval, and convert to invoices or projects.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-700'
                  : 'text-gray-500 hover:text-gray-800',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
