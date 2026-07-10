import { NavLink, Outlet } from 'react-router-dom';
import {
  Users,
  Building2,
  Clock,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { cn } from '../../../shared/utils/cn';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const navItems = [
  { to: ROUTES.HR.PEOPLE, label: 'People', icon: Users, end: false },
  { to: ROUTES.HR.DEPARTMENTS, label: 'Departments', icon: Building2 },
  { to: ROUTES.HR.ATTENDANCE, label: 'Attendance', icon: Clock },
  { to: ROUTES.HR.LEAVE, label: 'Leave', icon: CalendarDays },
  { to: ROUTES.HR.PAYROLL, label: 'Payroll', icon: Wallet },
  { to: ROUTES.HR.TALENT, label: 'Talent', icon: ClipboardCheck },
  { to: ROUTES.HR.REPORTS, label: 'Reports', icon: BarChart3 },
  { to: ROUTES.HR.SETTINGS, label: 'Settings', icon: SlidersHorizontal },
];

export default function HrLayout() {
  return (
    <div className="-mx-4 -mt-4 -mb-4 flex h-full min-h-0 flex-1 gap-4 p-4 sm:-mx-6 sm:-mt-6 sm:-mb-6 sm:p-6">
      <aside className={HR_SURFACE.sidenav}>
        <div className="border-b border-white/40 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Module</p>
          <h1 className="mt-1 text-lg font-semibold text-gray-900">HR & Payroll</h1>
          <p className="mt-1 text-xs text-gray-500">People, time, leave, and pay</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-900',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-6">
        <Outlet />
      </div>
    </div>
  );
}
