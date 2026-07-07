import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import {
  canViewProjectCosting,
  isProjectCollaboratorOnly,
} from '../../../shared/utils/moduleAccess';
import { FileSpreadsheet, FolderKanban, TrendingUp, LayoutTemplate, Briefcase, Kanban } from 'lucide-react';

export default function EstimatesLayout() {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const collaboratorOnly = isProjectCollaboratorOnly(user);
  const showFullEstimates = canViewProjectCosting(user);
  const onKanban = /^\/estimates\/boards\/\d+/.test(location.pathname);

  const tabs = collaboratorOnly
    ? [
        { to: ROUTES.ESTIMATES.MY_PROJECTS, label: 'My projects', icon: Briefcase, exact: true },
        { to: ROUTES.ESTIMATES.BOARDS, label: 'Project boards', icon: Kanban, exact: true },
        { to: ROUTES.ESTIMATES.PROJECTS, label: 'Projects', icon: FolderKanban },
      ]
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
      <div className="-mx-4 -mt-4 -mb-4 flex h-full min-h-0 flex-1 flex-col sm:-mx-6 sm:-mt-6 sm:-mb-6">
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
            {collaboratorOnly ? 'My projects' : 'Projects & Estimates'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {collaboratorOnly
              ? 'View assigned project boards and tasks.'
              : 'Build proposals, manage projects, and collaborate on project boards.'}
          </p>
        </div>
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
