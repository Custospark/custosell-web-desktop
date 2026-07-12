import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import {
  canViewFullEstimates,
  isLimitedEstimatesUser,
} from '../../../shared/utils/moduleAccess';
import { FileSpreadsheet, FolderKanban, TrendingUp, LayoutTemplate, Kanban } from 'lucide-react';

export default function EstimatesLayout() {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const limitedUser = isLimitedEstimatesUser(user);
  const showFullEstimates = canViewFullEstimates(user);
  const onKanban = /^\/estimates\/boards\/\d+/.test(location.pathname);

  const tabs = limitedUser
    ? []
    : [
        { to: ROUTES.ESTIMATES.INDEX, label: 'Estimates', icon: FileSpreadsheet, exact: true },
        { to: ROUTES.ESTIMATES.PROJECTS, label: 'Projects', icon: FolderKanban },
        { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban, exact: true },
        ...(showFullEstimates ? [
          { to: ROUTES.ESTIMATES.INSIGHTS, label: 'Insights', icon: TrendingUp },
          { to: ROUTES.ESTIMATES.TEMPLATES, label: 'Templates', icon: LayoutTemplate },
        ] : []),
      ];

  if (onKanban) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-x-auto">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 shadow-sm">
          <FileSpreadsheet className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {limitedUser ? 'Project boards' : 'Projects & Estimates'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {limitedUser
              ? 'Open a project board or create a personal workspace for your tasks.'
              : 'Build proposals, manage projects, and collaborate on project boards.'}
          </p>
        </div>
      </div>

      {tabs.length > 0 && (
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
      )}

      <div className="min-h-0 flex-1 pb-6">
        <Outlet />
      </div>
    </div>
  );
}
