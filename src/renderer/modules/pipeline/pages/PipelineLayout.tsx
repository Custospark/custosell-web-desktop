import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { Kanban, Briefcase, Users, TrendingUp, SlidersHorizontal } from 'lucide-react';

const tabs = [
  { to: ROUTES.PIPELINE.BOARDS, label: 'Boards', icon: Kanban, exact: true },
  { to: ROUTES.PIPELINE.MY_WORK, label: 'My Work', icon: Briefcase },
  { to: ROUTES.PIPELINE.LEADS, label: 'All Leads', icon: Users },
  { to: ROUTES.PIPELINE.INSIGHTS, label: 'Insights', icon: TrendingUp },
  { to: ROUTES.PIPELINE.SETTINGS, label: 'Settings', icon: SlidersHorizontal },
];

export default function PipelineLayout() {
  const location = useLocation();
  const onKanban = /^\/pipeline\/boards\/\d+/.test(location.pathname);

  if (onKanban) {
    return (
      <div className="-mx-4 -mt-4 -mb-4 flex h-full min-h-0 flex-1 flex-col sm:-mx-6 sm:-mt-6 sm:-mb-6">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Track leads, collaborate with your team, and convert opportunities.</p>
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
